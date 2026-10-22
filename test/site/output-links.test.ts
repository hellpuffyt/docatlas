/**
 * "Dead links fail the build" has to hold for the site that is actually
 * written, not only for the markdown graph. These tests crawl the generated
 * HTML and require every relative href to point at a file that exists (and,
 * with an anchor, at an element id in that file).
 */
import { mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync, existsSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildSite } from "../../src/site/build.js";
import { checkLinks } from "../../src/links/checker.js";

function htmlFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...htmlFiles(full));
    else if (full.endsWith(".html")) out.push(full);
  }
  return out;
}

/** Returns "file: href" for every relative href in the built site that does not resolve. */
function brokenOutputLinks(outDir: string): string[] {
  const root = resolve(outDir);
  const broken: string[] = [];
  for (const file of htmlFiles(root)) {
    const html = readFileSync(file, "utf8");
    for (const match of html.matchAll(/\shref="([^"]*)"/g)) {
      const href = (match[1] ?? "").replace(/&amp;/g, "&");
      if (href === "" || /^[a-z][a-z0-9+.-]*:/i.test(href)) continue;
      const [pathPart, anchor] = href.split("#") as [string, string | undefined];
      const target = pathPart === "" ? file : resolve(dirname(file), pathPart);
      const label = `${relative(root, file).split(sep).join("/")}: ${href}`;
      if (target !== root && !target.startsWith(root + sep)) {
        broken.push(`${label} (outside the site)`);
        continue;
      }
      if (!existsSync(target) || statSync(target).isDirectory()) {
        broken.push(`${label} (no such file)`);
        continue;
      }
      if (anchor && target.endsWith(".html") && !readFileSync(target, "utf8").includes(`id="${anchor}"`)) {
        broken.push(`${label} (no #${anchor})`);
      }
    }
  }
  return broken;
}

let root: string;
let docsDir: string;
let outDir: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "docatlas-outlinks-"));
  docsDir = join(root, "docs");
  outDir = join(root, "site");
  mkdirSync(docsDir, { recursive: true });
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function write(relPath: string, content: string): void {
  const full = join(docsDir, relPath);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content, "utf8");
}

describe("links in the generated HTML", () => {
  it("every accepted link form points at a real file in the output", () => {
    write(
      "index.md",
      [
        "# Home",
        "",
        "- [md link](./guide/setup.md)",
        "- [md link with anchor](guide/setup.md#install-it)",
        "- [extensionless](guide/setup)",
        "- [html link](guide/setup.html)",
        "- [same page](#home)",
        "- [external](https://example.com/x.md)",
        "",
      ].join("\n"),
    );
    write("guide/setup.md", "# Setup\n\n## Install it\n\nBack [home](../index.md#home) or to [ref](../reference/api.md).\n");
    write("reference/api.md", "# API\n\nSee [setup](../guide/setup.md#install-it) and **[nested](../index.md)**.\n");

    const result = buildSite({ docsDir, sourceDir: root, outDir });
    expect(result.linkErrors).toEqual([]);
    expect(brokenOutputLinks(outDir)).toEqual([]);

    const index = readFileSync(join(outDir, "index.html"), "utf8");
    expect(index).toContain('href="guide/setup.html"');
    expect(index).toContain('href="guide/setup.html#install-it"');
    expect(index).toContain('href="https://example.com/x.md"');
    const setup = readFileSync(join(outDir, "guide", "setup.html"), "utf8");
    expect(setup).toContain('href="../index.html#home"');
  });

  it("docatlas's own docs/ build to a site with zero broken links", () => {
    const repoRoot = resolve(__dirname, "..", "..");
    const result = buildSite({ docsDir: join(repoRoot, "docs"), sourceDir: repoRoot, outDir });
    expect(result.linkErrors).toEqual([]);
    expect(result.snippetErrors).toEqual([]);
    expect(brokenOutputLinks(outDir)).toEqual([]);
  });

  it("an unresolvable link is left as written (only reachable with --allow-broken-links)", () => {
    write("index.md", "# Home\n\n[gone](./missing.md)\n");
    const result = buildSite({ docsDir, sourceDir: root, outDir });
    expect(result.linkErrors).toHaveLength(1);
    expect(readFileSync(join(outDir, "index.html"), "utf8")).toContain('href="./missing.md"');
  });
});

describe("links that leave the docs root", () => {
  it("are dead links even if a page with the climbed-to name exists", () => {
    write("index.md", "# Home\n\n[up and back](../index.md) and [up twice](../../index.md)\n");
    const result = buildSite({ docsDir, sourceDir: root, outDir });
    expect(result.linkErrors.map((e) => e.href)).toEqual(["../index.md", "../../index.md"]);
  });

  it("checkLinks still accepts '..' that stays inside the root", () => {
    const pages = [
      { id: "a/b.md", sourcePath: "a/b.md", title: "B", blocks: [], headingSlugs: new Set<string>(), plainText: "", outgoingLinks: [{ href: "../c.md", line: 1 }] },
      { id: "c.md", sourcePath: "c.md", title: "C", blocks: [], headingSlugs: new Set<string>(), plainText: "", outgoingLinks: [] },
    ];
    expect(checkLinks(pages)).toEqual([]);
  });
});
