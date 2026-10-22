import type { LinkError, Page } from "../types.js";

export function isExternal(href: string): boolean {
  return /^([a-z][a-z0-9+.-]*:)\/\//i.test(href) || href.startsWith("mailto:");
}

/**
 * Resolves a relative doc link against the directory of the linking page.
 * Returns null when the link climbs above the docs root: such a target is
 * never part of the generated site, so it cannot be a valid link.
 */
function resolvePath(fromPath: string, href: string): string | null {
  const fromDir = fromPath.includes("/") ? fromPath.slice(0, fromPath.lastIndexOf("/")) : "";
  const segments = fromDir ? fromDir.split("/") : [];
  for (const part of href.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") {
      if (segments.length === 0) return null;
      segments.pop();
    } else segments.push(part);
  }
  return segments.join("/");
}

/**
 * Verifies every internal link and every in-page/cross-page heading anchor
 * resolves to a real page and a real heading. Returns one LinkError per
 * broken reference; an empty array means the doc graph is fully connected.
 */
// docatlas:start:check-links
export function checkLinks(pages: readonly Page[]): LinkError[] {
  const byPath = new Map(pages.map((p) => [p.sourcePath, p]));
  const errors: LinkError[] = [];

  for (const page of pages) {
    for (const link of page.outgoingLinks) {
      const { href } = link;
      if (href === "" || isExternal(href)) continue;

      const [pathPart, anchor] = splitAnchor(href);

      if (pathPart === "") {
        // Same-page anchor link.
        if (anchor && !page.headingSlugs.has(anchor)) {
          errors.push({
            page: page.sourcePath,
            href,
            line: link.line,
            reason: `no heading "#${anchor}" on this page`,
          });
        }
        continue;
      }

      const resolved = resolveTargetPath(page.sourcePath, pathPart, byPath);
      if (!resolved) {
        errors.push({
          page: page.sourcePath,
          href,
          line: link.line,
          reason: `no page resolves to "${pathPart}"`,
        });
        continue;
      }

      if (anchor && !resolved.headingSlugs.has(anchor)) {
        errors.push({
          page: page.sourcePath,
          href,
          line: link.line,
          reason: `page "${resolved.sourcePath}" has no heading "#${anchor}"`,
        });
      }
    }
  }

  return errors;
}
// docatlas:end:check-links

export function splitAnchor(href: string): [string, string | undefined] {
  const idx = href.indexOf("#");
  if (idx === -1) return [href, undefined];
  return [href.slice(0, idx), href.slice(idx + 1)];
}

export function resolveTargetPath(
  fromPath: string,
  pathPart: string,
  byPath: ReadonlyMap<string, Page>,
): Page | undefined {
  const resolved = resolvePath(fromPath, pathPart);
  if (resolved === null) return undefined;
  const candidates = [resolved, `${resolved}.md`, resolved.replace(/\.html?$/, ".md")];
  for (const candidate of candidates) {
    const page = byPath.get(candidate);
    if (page) return page;
  }
  return undefined;
}
