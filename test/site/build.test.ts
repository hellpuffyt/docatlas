import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildSite } from "../../src/site/build.js";
import type { SearchIndex } from "../../src/search/index.js";

let root: string;
let docsDir: string;
let sourceDir: string;
let outDir: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "docatlas-build-"));
  docsDir = join(root, "docs");
  sourceDir = join(root, "src");
  outDir = join(root, "site");
  mkdirSync(docsDir, { recursive: true });
  mkdirSync(sourceDir, { recursive: true });
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function write(dir: string, relPath: string, content: string): void {
  const full = join(dir, relPath);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, content, "utf8");
}

describe("buildSite", () => {
  it("writes one HTML file per markdown page", () => {
    write(docsDir, "index.md", "# Home\n\nWelcome.\n");
    write(docsDir, "guide.md", "# Guide\n\nDetails.\n");
    const result = buildSite({ docsDir, sourceDir, outDir });
    expect(result.pages).toHaveLength(2);
    expect(existsSync(join(outDir, "index.html"))).toBe(true);
    expect(existsSync(join(outDir, "guide.html"))).toBe(true);
  });

  it("writes the stylesheet and search index assets", () => {
    write(docsDir, "index.md", "# Home\n");
    buildSite({ docsDir, sourceDir, outDir });
    expect(existsSync(join(outDir, "assets", "style.css"))).toBe(true);
    expect(existsSync(join(outDir, "assets", "search-index.json"))).toBe(true);
  });

  it("resolves a live include against the real source tree", () => {
    write(sourceDir, "example.ts", "// docatlas:start:demo\nconst answer = 42;\n// docatlas:end:demo\n");
    write(docsDir, "index.md", '# Home\n\n```ts include="example.ts#demo"\n```\n');
    const result = buildSite({ docsDir, sourceDir, outDir });
    expect(result.snippetErrors).toEqual([]);
    const html = readFileSync(join(outDir, "index.html"), "utf8");
    expect(html).toContain("const answer = 42;");
    expect(html).toContain("live:");
  });

  it("reports a snippet error for an include that targets a missing file", () => {
    write(docsDir, "index.md", '# Home\n\n```ts include="nope.ts"\n```\n');
    const result = buildSite({ docsDir, sourceDir, outDir });
    expect(result.snippetErrors).toHaveLength(1);
    expect(result.snippetErrors[0]?.reason).toMatch(/not found/);
  });

  it("reports a link error for a dead internal link", () => {
    write(docsDir, "index.md", "# Home\n\n[broken](./missing.md)\n");
    const result = buildSite({ docsDir, sourceDir, outDir });
    expect(result.linkErrors).toHaveLength(1);
    expect(result.linkErrors[0]?.href).toBe("./missing.md");
  });

  it("reports a link error for a dead heading anchor", () => {
    write(docsDir, "index.md", "# Home\n\n[bad anchor](#nowhere)\n");
    const result = buildSite({ docsDir, sourceDir, outDir });
    expect(result.linkErrors).toHaveLength(1);
  });

  it("does not report an error for a valid cross-page link and anchor", () => {
    write(docsDir, "index.md", "# Home\n\n[guide](./guide.md#setup)\n");
    write(docsDir, "guide.md", "# Guide\n\n## Setup\n\ntext\n");
    const result = buildSite({ docsDir, sourceDir, outDir });
    expect(result.linkErrors).toEqual([]);
  });

  it("synthesizes an index page when no index.md is present", () => {
    write(docsDir, "guide.md", "# Guide\n");
    const result = buildSite({ docsDir, sourceDir, outDir });
    expect(existsSync(join(outDir, "index.html"))).toBe(true);
    const html = readFileSync(join(outDir, "index.html"), "utf8");
    expect(html).toContain("Guide");
    expect(result.pages.some((p) => p.sourcePath === "index.md")).toBe(false);
  });

  it("derives a page title from front matter over the first heading", () => {
    write(docsDir, "index.md", "---\ntitle: Custom Title\n---\n# Different Heading\n");
    const result = buildSite({ docsDir, sourceDir, outDir });
    expect(result.pages[0]?.title).toBe("Custom Title");
  });

  it("derives a page title from the first heading when there is no front matter", () => {
    write(docsDir, "index.md", "# Heading Title\n\ntext\n");
    const result = buildSite({ docsDir, sourceDir, outDir });
    expect(result.pages[0]?.title).toBe("Heading Title");
  });

  it("derives a page title from the file name as a last resort", () => {
    write(docsDir, "getting-started.md", "no headings here, just text\n");
    write(docsDir, "index.md", "# Home\n");
    const result = buildSite({ docsDir, sourceDir, outDir });
    const page = result.pages.find((p) => p.sourcePath === "getting-started.md");
    expect(page?.title).toBe("Getting Started");
  });

  it("walks nested subdirectories of the docs tree", () => {
    write(docsDir, "guide/setup.md", "# Setup\n");
    write(docsDir, "index.md", "# Home\n");
    const result = buildSite({ docsDir, sourceDir, outDir });
    expect(result.pages.some((p) => p.sourcePath === "guide/setup.md")).toBe(true);
    expect(existsSync(join(outDir, "guide", "setup.html"))).toBe(true);
  });

  it("writes asset and nav links on a nested page relative to that page's own directory", () => {
    write(docsDir, "guide/setup.md", "# Setup\n");
    write(docsDir, "index.md", "# Home\n");
    buildSite({ docsDir, sourceDir, outDir });
    const html = readFileSync(join(outDir, "guide", "setup.html"), "utf8");
    expect(html).toContain('href="../assets/style.css"');
    expect(html).toContain('src="../assets/js/site/browser/search-client.js"');
    expect(html).toContain('href="../index.html"');
    expect(html).toContain('window.__docatlasRootPrefix = "../";');
  });

  it("writes root-relative asset and nav links (no prefix) for a page at the docs root", () => {
    write(docsDir, "index.md", "# Home\n");
    buildSite({ docsDir, sourceDir, outDir });
    const html = readFileSync(join(outDir, "index.html"), "utf8");
    expect(html).toContain('href="assets/style.css"');
    expect(html).toContain('window.__docatlasRootPrefix = "";');
  });

  it("prefixes links from a page two directories deep with two levels of ../", () => {
    write(docsDir, "a/b/deep.md", "# Deep\n");
    write(docsDir, "index.md", "# Home\n");
    buildSite({ docsDir, sourceDir, outDir });
    const html = readFileSync(join(outDir, "a", "b", "deep.html"), "utf8");
    expect(html).toContain('href="../../assets/style.css"');
    expect(html).toContain('window.__docatlasRootPrefix = "../../";');
  });

  it("builds a search index whose postings resolve to real page URLs", () => {
    write(docsDir, "index.md", "# Home\n\nSearchable content about widgets.\n");
    buildSite({ docsDir, sourceDir, outDir });
    const index = JSON.parse(
      readFileSync(join(outDir, "assets", "search-index.json"), "utf8"),
    ) as SearchIndex;
    expect(index.docs[0]?.url).toBe("index.html");
    expect(Object.keys(index.postings)).toContain("widget");
  });

  it("produces an empty build with zero errors for an empty docs directory", () => {
    const result = buildSite({ docsDir, sourceDir, outDir });
    expect(result.pages).toEqual([]);
    expect(result.linkErrors).toEqual([]);
    expect(result.snippetErrors).toEqual([]);
  });

  it("refuses includes that resolve outside --source", () => {
    write(root, "secret.txt", "TOP SECRET\n");
    write(docsDir, "index.md", "# Home\n\n```txt include=\"../secret.txt\"\n```\n");
    const result = buildSite({ docsDir, sourceDir, outDir });
    expect(result.snippetErrors).toHaveLength(1);
    expect(result.snippetErrors[0]?.reason).toContain("not found");
    expect(readFileSync(join(outDir, "index.html"), "utf8")).not.toContain("TOP SECRET");
  });
});
