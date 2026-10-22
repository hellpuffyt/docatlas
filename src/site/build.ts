import { fileURLToPath } from "node:url";
import * as fs from "node:fs";
import * as path from "node:path";
import { parseMarkdown } from "../markdown/parser.js";
import { collectLinks } from "../markdown/inline.js";
import { resolveSnippets } from "../snippets/resolver.js";
import { checkLinks, isExternal, resolveTargetPath, splitAnchor } from "../links/checker.js";
import { buildIndex } from "../search/index.js";
import { blocksToPlainText, renderBlocks, type HrefRewriter } from "./render.js";
import { renderPage, renderStyle } from "./template.js";
import type { Block, BuildResult, Page, PageLink, SnippetError } from "../types.js";

export interface BuildOptions {
  readonly docsDir: string;
  readonly sourceDir: string;
  readonly outDir: string;
  readonly siteTitle?: string;
}

function walkMarkdownFiles(root: string): string[] {
  const results: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        results.push(path.relative(root, full).split(path.sep).join("/"));
      }
    }
  };
  if (fs.existsSync(root)) walk(root);
  return results.sort();
}

function toHtmlPath(sourcePath: string): string {
  return sourcePath.replace(/\.md$/, ".html");
}

/**
 * The "../" prefix that gets a link on `htmlPath` back to the site root —
 * every nav link, asset reference and search-result URL is written relative
 * to the page's own directory using this, rather than a fixed "./assets/...",
 * so the generated HTML is correct however deep the page is nested.
 */
function rootPrefixFor(htmlPath: string): string {
  const depth = htmlPath.split("/").length - 1;
  return "../".repeat(depth);
}

/**
 * Rewrites a page's source-level links to the URLs that exist in the built
 * site: `guide/x.md#a` (or `guide/x`, `guide/x.html`) on `index.md` becomes
 * `guide/x.html#a`, written relative to the linking page's own HTML file.
 * External links, same-page anchors and unresolvable links (only possible
 * with --allow-broken-links) are left exactly as written.
 */
export function hrefRewriterFor(page: Page, byPath: ReadonlyMap<string, Page>): HrefRewriter {
  const fromDir = path.posix.dirname(toHtmlPath(page.sourcePath));
  return (href) => {
    if (href === "" || isExternal(href) || href.startsWith("#")) return href;
    const [pathPart, anchor] = splitAnchor(href);
    const target = resolveTargetPath(page.sourcePath, pathPart, byPath);
    if (!target) return href;
    const rel = path.posix.relative(fromDir, toHtmlPath(target.sourcePath));
    return anchor === undefined ? rel : `${rel}#${anchor}`;
  };
}

function titleFromPath(sourcePath: string): string {
  const base = sourcePath.split("/").pop() ?? sourcePath;
  const stem = base.replace(/\.md$/, "");
  return stem
    .split(/[-_]/)
    .map((w) => (w.length > 0 ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function extractPageLinks(blocks: readonly Block[]): PageLink[] {
  const links: PageLink[] = [];
  for (const block of blocks) {
    if (block.type === "paragraph" || block.type === "blockquote") {
      links.push(...collectLinks(block.children));
    } else if (block.type === "list") {
      for (const item of block.items) links.push(...collectLinks(item));
    }
  }
  return links;
}

/** Resolves the directory containing docatlas's own compiled browser assets. */
function findDistRoot(): string {
  return path.dirname(path.dirname(fileURLToPath(import.meta.url)));
}

/**
 * Builds a full documentation site: parses every markdown page, resolves
 * `include`-tagged code fences against the real source tree, checks every
 * internal link and heading anchor, builds a real inverted search index,
 * and writes static HTML + assets. Snippet and link errors are returned
 * (not thrown) so callers can decide policy (e.g. `--fail-on-broken-links`).
 */
export function buildSite(options: BuildOptions): BuildResult {
  const { docsDir, sourceDir, outDir } = options;
  const siteTitle = options.siteTitle ?? "Documentation";

  const sourceCache = new Map<string, string | undefined>();
  const readSource = (relPath: string): string | undefined => {
    if (sourceCache.has(relPath)) return sourceCache.get(relPath);
    const full = path.join(sourceDir, relPath);
    const value = fs.existsSync(full) && fs.statSync(full).isFile()
      ? fs.readFileSync(full, "utf8")
      : undefined;
    sourceCache.set(relPath, value);
    return value;
  };

  const mdFiles = walkMarkdownFiles(docsDir);
  const pages: Page[] = [];
  const allSnippetErrors: SnippetError[] = [];

  for (const sourcePath of mdFiles) {
    const raw = fs.readFileSync(path.join(docsDir, sourcePath), "utf8");
    const parsed = parseMarkdown(raw);
    const { blocks, errors } = resolveSnippets(parsed.blocks, sourcePath, readSource);
    allSnippetErrors.push(...errors);

    const headingSlugs = new Set(
      blocks.filter((b): b is Extract<Block, { type: "heading" }> => b.type === "heading").map((b) => b.slug),
    );
    const firstHeading = blocks.find((b): b is Extract<Block, { type: "heading" }> => b.type === "heading");
    const title = parsed.frontMatter.title ?? firstHeading?.text ?? titleFromPath(sourcePath);

    pages.push({
      id: sourcePath,
      sourcePath,
      title,
      blocks,
      headingSlugs,
      outgoingLinks: extractPageLinks(blocks),
      plainText: blocksToPlainText(blocks),
    });
  }

  const linkErrors = checkLinks(pages);

  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(path.join(outDir, "assets"), { recursive: true });

  const nav = pages.map((p) => ({ href: toHtmlPath(p.sourcePath), title: p.title }));
  const byPath = new Map(pages.map((p) => [p.sourcePath, p]));

  for (const page of pages) {
    const htmlPath = toHtmlPath(page.sourcePath);
    const html = renderPage({
      siteTitle,
      title: page.title,
      bodyHtml: renderBlocks(page.blocks, hrefRewriterFor(page, byPath)),
      nav,
      currentHref: htmlPath,
      rootPrefix: rootPrefixFor(htmlPath),
    });
    const outPath = path.join(outDir, htmlPath);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, html, "utf8");
  }

  if (!pages.some((p) => p.sourcePath === "index.md")) {
    const html = renderPage({
      siteTitle,
      title: siteTitle,
      bodyHtml: `<h1>${escapeHtml(siteTitle)}</h1><ul class="index-list">${pages
        .map((p) => `<li><a href="${toHtmlPath(p.sourcePath)}">${escapeHtml(p.title)}</a></li>`)
        .join("")}</ul>`,
      nav,
      currentHref: "index.html",
      rootPrefix: "",
    });
    fs.writeFileSync(path.join(outDir, "index.html"), html, "utf8");
  }

  fs.writeFileSync(path.join(outDir, "assets", "style.css"), renderStyle(), "utf8");

  const searchIndex = buildIndex(
    pages.map((p) => ({ id: p.sourcePath, title: p.title, url: toHtmlPath(p.sourcePath), text: p.plainText })),
  );
  fs.writeFileSync(
    path.join(outDir, "assets", "search-index.json"),
    JSON.stringify(searchIndex),
    "utf8",
  );

  copyBrowserAssets(outDir);

  return { pages, linkErrors, snippetErrors: allSnippetErrors, outDir };
}

function copyBrowserAssets(outDir: string): void {
  const distRoot = findDistRoot();
  const jsOutRoot = path.join(outDir, "assets", "js");
  const files = [
    path.join("search", "tokenize.js"),
    path.join("search", "bm25.js"),
    path.join("site", "browser", "search-client.js"),
  ];
  for (const rel of files) {
    const src = path.join(distRoot, rel);
    const dest = path.join(jsOutRoot, rel);
    if (!fs.existsSync(src)) continue; // running from source (e.g. tests); site still valid without the copied client
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
