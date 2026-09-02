import { describe, expect, it } from "vitest";
import { checkLinks } from "../../src/links/checker.js";
import type { Page } from "../../src/types.js";

function page(overrides: Partial<Page>): Page {
  return {
    id: overrides.sourcePath ?? "p.md",
    sourcePath: "p.md",
    title: "P",
    blocks: [],
    headingSlugs: new Set(),
    outgoingLinks: [],
    plainText: "",
    ...overrides,
  };
}

describe("checkLinks", () => {
  it("reports no errors when there are no outgoing links", () => {
    expect(checkLinks([page({})])).toEqual([]);
  });

  it("ignores external http(s) links", () => {
    const pages = [page({ outgoingLinks: [{ href: "https://example.com", line: 1 }] })];
    expect(checkLinks(pages)).toEqual([]);
  });

  it("ignores mailto links", () => {
    const pages = [page({ outgoingLinks: [{ href: "mailto:a@b.com", line: 1 }] })];
    expect(checkLinks(pages)).toEqual([]);
  });

  it("ignores empty href", () => {
    const pages = [page({ outgoingLinks: [{ href: "", line: 1 }] })];
    expect(checkLinks(pages)).toEqual([]);
  });

  it("resolves a relative link to a sibling page", () => {
    const pages = [
      page({ sourcePath: "a.md", outgoingLinks: [{ href: "b.md", line: 1 }] }),
      page({ sourcePath: "b.md" }),
    ];
    expect(checkLinks(pages)).toEqual([]);
  });

  it("flags a link to a page that does not exist", () => {
    const pages = [page({ sourcePath: "a.md", outgoingLinks: [{ href: "missing.md", line: 4 }] })];
    const errors = checkLinks(pages);
    expect(errors).toEqual([
      { page: "a.md", href: "missing.md", line: 4, reason: 'no page resolves to "missing.md"' },
    ]);
  });

  it("resolves ../ relative links against the linking page's directory", () => {
    const pages = [
      page({ sourcePath: "guide/setup.md", outgoingLinks: [{ href: "../index.md", line: 1 }] }),
      page({ sourcePath: "index.md" }),
    ];
    expect(checkLinks(pages)).toEqual([]);
  });

  it("validates a same-page heading anchor", () => {
    const pages = [
      page({
        sourcePath: "a.md",
        headingSlugs: new Set(["intro"]),
        outgoingLinks: [{ href: "#intro", line: 1 }],
      }),
    ];
    expect(checkLinks(pages)).toEqual([]);
  });

  it("flags a same-page anchor that does not exist", () => {
    const pages = [
      page({ sourcePath: "a.md", outgoingLinks: [{ href: "#nope", line: 2 }] }),
    ];
    const errors = checkLinks(pages);
    expect(errors[0]?.reason).toMatch(/no heading "#nope"/);
  });

  it("validates a cross-page heading anchor", () => {
    const pages = [
      page({ sourcePath: "a.md", outgoingLinks: [{ href: "b.md#section", line: 1 }] }),
      page({ sourcePath: "b.md", headingSlugs: new Set(["section"]) }),
    ];
    expect(checkLinks(pages)).toEqual([]);
  });

  it("flags a cross-page anchor that does not exist on the target page", () => {
    const pages = [
      page({ sourcePath: "a.md", outgoingLinks: [{ href: "b.md#nope", line: 3 }] }),
      page({ sourcePath: "b.md", headingSlugs: new Set(["other"]) }),
    ];
    const errors = checkLinks(pages);
    expect(errors[0]?.reason).toMatch(/has no heading "#nope"/);
  });

  it("resolves an .html-suffixed link back to its .md source page", () => {
    const pages = [
      page({ sourcePath: "a.md", outgoingLinks: [{ href: "b.html", line: 1 }] }),
      page({ sourcePath: "b.md" }),
    ];
    expect(checkLinks(pages)).toEqual([]);
  });

  it("collects errors across multiple pages", () => {
    const pages = [
      page({ sourcePath: "a.md", outgoingLinks: [{ href: "x.md", line: 1 }] }),
      page({ sourcePath: "b.md", outgoingLinks: [{ href: "y.md", line: 2 }] }),
    ];
    expect(checkLinks(pages)).toHaveLength(2);
  });
});
