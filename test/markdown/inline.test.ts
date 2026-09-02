import { describe, expect, it } from "vitest";
import { collectLinks, inlineToPlainText, parseInline } from "../../src/markdown/inline.js";

describe("parseInline", () => {
  it("parses plain text as a single text node", () => {
    expect(parseInline("hello world", 1)).toEqual([{ type: "text", value: "hello world" }]);
  });

  it("parses inline code spans", () => {
    expect(parseInline("run `docatlas build`", 1)).toEqual([
      { type: "text", value: "run " },
      { type: "code", value: "docatlas build" },
    ]);
  });

  it("parses strong emphasis", () => {
    expect(parseInline("**bold**", 1)).toEqual([
      { type: "strong", children: [{ type: "text", value: "bold" }] },
    ]);
  });

  it("parses italic emphasis", () => {
    expect(parseInline("*italic*", 1)).toEqual([
      { type: "em", children: [{ type: "text", value: "italic" }] },
    ]);
  });

  it("parses links with a line number", () => {
    expect(parseInline("[docs](./guide.md)", 5)).toEqual([
      {
        type: "link",
        href: "./guide.md",
        children: [{ type: "text", value: "docs" }],
        line: 5,
      },
    ]);
  });

  it("parses nested emphasis inside a link label", () => {
    const nodes = parseInline("[**bold link**](./a.md)", 1);
    expect(nodes[0]).toMatchObject({ type: "link", href: "./a.md" });
    const link = nodes[0] as { children: unknown[] };
    expect(link.children).toEqual([{ type: "strong", children: [{ type: "text", value: "bold link" }] }]);
  });

  it("leaves an unterminated code span as literal text", () => {
    expect(parseInline("a `broken", 1)).toEqual([{ type: "text", value: "a `broken" }]);
  });

  it("leaves an unterminated link as literal text", () => {
    expect(parseInline("[oops](no-close", 1)).toEqual([{ type: "text", value: "[oops](no-close" }]);
  });

  it("does not treat a lone asterisk pair with nothing between as emphasis", () => {
    expect(parseInline("**", 1)).toEqual([{ type: "text", value: "**" }]);
  });
});

describe("inlineToPlainText", () => {
  it("flattens mixed inline content to plain text", () => {
    const nodes = parseInline("See **the `code`** [here](./x.md)", 1);
    expect(inlineToPlainText(nodes)).toBe("See the code here");
  });
});

describe("collectLinks", () => {
  it("finds links nested inside strong and em", () => {
    const nodes = parseInline("**[a](./a.md)** and *[b](./b.md)*", 1);
    const links = collectLinks(nodes);
    expect(links.map((l) => l.href)).toEqual(["./a.md", "./b.md"]);
  });

  it("returns an empty array when there are no links", () => {
    expect(collectLinks(parseInline("just text", 1))).toEqual([]);
  });
});
