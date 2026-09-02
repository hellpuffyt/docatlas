import { describe, expect, it } from "vitest";
import { resolveSnippets } from "../../src/snippets/resolver.js";
import type { Block, CodeFence } from "../../src/types.js";

function fence(overrides: Partial<CodeFence>): CodeFence {
  return {
    type: "code-fence",
    lang: "",
    meta: "",
    lines: [],
    line: 1,
    ...overrides,
  };
}

describe("resolveSnippets", () => {
  it("passes through blocks with no include directive unchanged", () => {
    const blocks: Block[] = [{ type: "heading", level: 1, text: "H", slug: "h", line: 1 }];
    const { blocks: out, errors } = resolveSnippets(blocks, "p.md", () => undefined);
    expect(out).toEqual(blocks);
    expect(errors).toEqual([]);
  });

  it("injects the resolved file content into an empty include fence", () => {
    const blocks: Block[] = [fence({ include: { file: "a.ts" } })];
    const { blocks: out, errors } = resolveSnippets(blocks, "p.md", (p) =>
      p === "a.ts" ? "const a = 1;\n" : undefined,
    );
    expect(errors).toEqual([]);
    expect((out[0] as CodeFence).lines).toEqual(["const a = 1;"]);
  });

  it("infers the fence language from the file extension when none is given", () => {
    const blocks: Block[] = [fence({ include: { file: "a.py" } })];
    const { blocks: out } = resolveSnippets(blocks, "p.md", () => "x = 1");
    expect((out[0] as CodeFence).lang).toBe("python");
  });

  it("keeps an explicit fence language over the inferred one", () => {
    const blocks: Block[] = [fence({ lang: "text", include: { file: "a.py" } })];
    const { blocks: out } = resolveSnippets(blocks, "p.md", () => "x = 1");
    expect((out[0] as CodeFence).lang).toBe("text");
  });

  it("resolves a named region", () => {
    const source = "// docatlas:start:r\nbody();\n// docatlas:end:r\n";
    const blocks: Block[] = [fence({ include: { file: "a.ts", region: "r" } })];
    const { blocks: out, errors } = resolveSnippets(blocks, "p.md", () => source);
    expect(errors).toEqual([]);
    expect((out[0] as CodeFence).lines).toEqual(["body();"]);
  });

  it("resolves a line range", () => {
    const source = "l1\nl2\nl3\n";
    const blocks: Block[] = [
      fence({ include: { file: "a.ts", lineRange: { start: 2, end: 3 } } }),
    ];
    const { blocks: out } = resolveSnippets(blocks, "p.md", () => source);
    expect((out[0] as CodeFence).lines).toEqual(["l2", "l3"]);
  });

  it("errors when the include fence is not empty in the markdown source", () => {
    const blocks: Block[] = [fence({ lines: ["not empty"], include: { file: "a.ts" } })];
    const { errors } = resolveSnippets(blocks, "p.md", () => "content");
    expect(errors).toHaveLength(1);
    expect(errors[0]?.reason).toMatch(/must be empty/);
  });

  it("errors when the source file cannot be found", () => {
    const blocks: Block[] = [fence({ include: { file: "missing.ts" } })];
    const { errors } = resolveSnippets(blocks, "p.md", () => undefined);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.reason).toMatch(/not found/);
  });

  it("errors when a named region cannot be found in the source", () => {
    const blocks: Block[] = [fence({ include: { file: "a.ts", region: "nope" } })];
    const { errors } = resolveSnippets(blocks, "p.md", () => "no markers here");
    expect(errors).toHaveLength(1);
    expect(errors[0]?.file).toBe("a.ts");
  });

  it("errors when a line range is out of bounds", () => {
    const blocks: Block[] = [
      fence({ include: { file: "a.ts", lineRange: { start: 1, end: 999 } } }),
    ];
    const { errors } = resolveSnippets(blocks, "p.md", () => "one line");
    expect(errors).toHaveLength(1);
  });

  it("strips a single trailing newline for a whole-file include", () => {
    const blocks: Block[] = [fence({ include: { file: "a.ts" } })];
    const { blocks: out } = resolveSnippets(blocks, "p.md", () => "line1\nline2\n");
    expect((out[0] as CodeFence).lines).toEqual(["line1", "line2"]);
  });
});
