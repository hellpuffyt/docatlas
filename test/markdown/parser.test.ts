import { describe, expect, it } from "vitest";
import { parseIncludeMeta, parseMarkdown } from "../../src/markdown/parser.js";

describe("parseIncludeMeta", () => {
  it("returns undefined when there is no include attribute", () => {
    expect(parseIncludeMeta("ts")).toBeUndefined();
  });

  it("parses a region reference", () => {
    expect(parseIncludeMeta('ts include="src/a.ts#setup"')).toEqual({
      file: "src/a.ts",
      region: "setup",
    });
  });

  it("parses a line-range reference", () => {
    expect(parseIncludeMeta('ts include="src/a.ts:3-9"')).toEqual({
      file: "src/a.ts",
      lineRange: { start: 3, end: 9 },
    });
  });

  it("parses a whole-file reference with no region or range", () => {
    expect(parseIncludeMeta('ts include="src/a.ts"')).toEqual({ file: "src/a.ts" });
  });

  it("does not confuse a colon inside a directory name for a range separator", () => {
    // no digits after the last "/"-relative colon => falls back to whole file
    expect(parseIncludeMeta('include="src/weird:dir/a.ts"')).toEqual({
      file: "src/weird:dir/a.ts",
    });
  });
});

describe("parseMarkdown", () => {
  it("extracts front matter and parses the body", () => {
    const doc = parseMarkdown("---\ntitle: Hi\n---\n# Heading\n");
    expect(doc.frontMatter["title"]).toBe("Hi");
    expect(doc.blocks).toEqual([
      { type: "heading", level: 1, text: "Heading", slug: "heading", line: 1 },
    ]);
  });

  it("parses headings of every level", () => {
    const doc = parseMarkdown("# h1\n## h2\n###### h6\n");
    expect(doc.blocks.map((b) => (b.type === "heading" ? b.level : null))).toEqual([1, 2, 6]);
  });

  it("de-duplicates heading slugs within one document", () => {
    const doc = parseMarkdown("# Intro\n# Intro\n");
    const slugs = doc.blocks.map((b) => (b.type === "heading" ? b.slug : null));
    expect(slugs).toEqual(["intro", "intro-1"]);
  });

  it("parses a fenced code block with a language", () => {
    const doc = parseMarkdown("```ts\nconst a = 1;\n```\n");
    expect(doc.blocks).toEqual([
      { type: "code-fence", lang: "ts", meta: "", lines: ["const a = 1;"], line: 1 },
    ]);
  });

  it("parses a fenced code block with an include directive", () => {
    const doc = parseMarkdown('```ts include="src/a.ts#region"\n```\n');
    const fence = doc.blocks[0];
    expect(fence).toMatchObject({
      type: "code-fence",
      include: { file: "src/a.ts", region: "region" },
    });
  });

  it("parses a thematic break", () => {
    expect(parseMarkdown("---\n").blocks).toEqual([{ type: "hr", line: 1 }]);
  });

  it("parses a multi-line blockquote as one block", () => {
    const doc = parseMarkdown("> line one\n> line two\n");
    expect(doc.blocks).toHaveLength(1);
    expect(doc.blocks[0]?.type).toBe("blockquote");
  });

  it("parses an unordered list", () => {
    const doc = parseMarkdown("- a\n- b\n- c\n");
    expect(doc.blocks).toHaveLength(1);
    const list = doc.blocks[0];
    expect(list).toMatchObject({ type: "list", ordered: false });
  });

  it("parses an ordered list", () => {
    const doc = parseMarkdown("1. a\n2. b\n");
    expect(doc.blocks[0]).toMatchObject({ type: "list", ordered: true });
  });

  it("joins consecutive non-blank lines into one paragraph", () => {
    const doc = parseMarkdown("line one\nline two\n\nline three\n");
    const paragraphs = doc.blocks.filter((b) => b.type === "paragraph");
    expect(paragraphs).toHaveLength(2);
  });

  it("skips blank lines between blocks", () => {
    const doc = parseMarkdown("# a\n\n\n# b\n");
    expect(doc.blocks).toHaveLength(2);
  });

  it("records 1-indexed line numbers for blocks", () => {
    const doc = parseMarkdown("\n\n# third line\n");
    const heading = doc.blocks[0];
    expect(heading).toMatchObject({ line: 3 });
  });

  it("folds a wrapped continuation line into the current list item", () => {
    const doc = parseMarkdown("- first item\n  continues here\n- second item\n");
    expect(doc.blocks).toHaveLength(1);
    const list = doc.blocks[0];
    expect(list).toMatchObject({ type: "list" });
    if (list?.type === "list") {
      expect(list.items).toHaveLength(2);
      expect(list.items[0]?.[0]).toMatchObject({ value: "first item continues here" });
    }
  });

  it("stops list continuation at a new block (e.g. a heading)", () => {
    const doc = parseMarkdown("- item\n# Heading\n");
    expect(doc.blocks).toHaveLength(2);
    expect(doc.blocks[1]).toMatchObject({ type: "heading" });
  });

  it("does not treat an include fence's info string content as free text", () => {
    const doc = parseMarkdown('```ts include="src/a.ts"\nplaceholder text\n```\n');
    const fence = doc.blocks[0];
    expect(fence).toMatchObject({ lines: ["placeholder text"] });
  });
});
