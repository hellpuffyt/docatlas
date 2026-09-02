import { describe, expect, it } from "vitest";
import { blocksToPlainText, escapeHtml, renderBlocks } from "../../src/site/render.js";
import type { Block } from "../../src/types.js";

describe("escapeHtml", () => {
  it("escapes the five HTML-significant characters", () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;",
    );
  });
});

describe("renderBlocks", () => {
  it("renders a heading with its slug as the id", () => {
    const blocks: Block[] = [{ type: "heading", level: 2, text: "Setup", slug: "setup", line: 1 }];
    expect(renderBlocks(blocks)).toBe('<h2 id="setup">Setup</h2>');
  });

  it("renders a paragraph with inline formatting", () => {
    const blocks: Block[] = [
      {
        type: "paragraph",
        line: 1,
        children: [
          { type: "text", value: "see " },
          { type: "code", value: "x" },
        ],
      },
    ];
    expect(renderBlocks(blocks)).toBe("<p>see <code>x</code></p>");
  });

  it("renders an unordered list", () => {
    const blocks: Block[] = [
      { type: "list", ordered: false, line: 1, items: [[{ type: "text", value: "a" }]] },
    ];
    expect(renderBlocks(blocks)).toBe("<ul><li>a</li></ul>");
  });

  it("renders an ordered list", () => {
    const blocks: Block[] = [
      { type: "list", ordered: true, line: 1, items: [[{ type: "text", value: "a" }]] },
    ];
    expect(renderBlocks(blocks)).toBe("<ol><li>a</li></ol>");
  });

  it("renders a blockquote", () => {
    const blocks: Block[] = [
      { type: "blockquote", line: 1, children: [{ type: "text", value: "quote" }] },
    ];
    expect(renderBlocks(blocks)).toBe("<blockquote>quote</blockquote>");
  });

  it("renders a thematic break", () => {
    expect(renderBlocks([{ type: "hr", line: 1 }])).toBe("<hr>");
  });

  it("renders a plain code fence with a language class", () => {
    const blocks: Block[] = [{ type: "code-fence", lang: "ts", meta: "", lines: ["a();"], line: 1 }];
    expect(renderBlocks(blocks)).toBe(
      '<div class="code-block"><pre><code class="language-ts">a();</code></pre></div>',
    );
  });

  it("renders a live badge for an include-backed code fence", () => {
    const blocks: Block[] = [
      {
        type: "code-fence",
        lang: "ts",
        meta: "",
        lines: ["a();"],
        line: 1,
        include: { file: "src/a.ts" },
      },
    ];
    const html = renderBlocks(blocks);
    expect(html).toContain('class="live-badge"');
    expect(html).toContain("src/a.ts");
  });

  it("escapes HTML-significant characters inside code fences", () => {
    const blocks: Block[] = [{ type: "code-fence", lang: "", meta: "", lines: ["<script>"], line: 1 }];
    expect(renderBlocks(blocks)).toContain("&lt;script&gt;");
  });

  it("joins multiple blocks with a newline", () => {
    const blocks: Block[] = [
      { type: "heading", level: 1, text: "A", slug: "a", line: 1 },
      { type: "hr", line: 2 },
    ];
    expect(renderBlocks(blocks)).toBe('<h1 id="a">A</h1>\n<hr>');
  });
});

describe("blocksToPlainText", () => {
  it("flattens headings, paragraphs, lists and code into plain text joined by spaces", () => {
    const blocks: Block[] = [
      { type: "heading", level: 1, text: "Title", slug: "title", line: 1 },
      { type: "paragraph", line: 2, children: [{ type: "text", value: "body text" }] },
      { type: "list", ordered: false, line: 3, items: [[{ type: "text", value: "item" }]] },
      { type: "code-fence", lang: "", meta: "", lines: ["code line"], line: 4 },
    ];
    expect(blocksToPlainText(blocks)).toBe("Title body text item code line");
  });

  it("contributes nothing for a thematic break", () => {
    expect(blocksToPlainText([{ type: "hr", line: 1 }])).toBe("");
  });
});
