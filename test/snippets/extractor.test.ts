import { describe, expect, it } from "vitest";
import {
  extractLineRange,
  extractRegion,
  SnippetExtractionError,
} from "../../src/snippets/extractor.js";

describe("extractRegion", () => {
  const file = [
    "function setup() {",
    "  // docatlas:start:body",
    "  const x = 1;",
    "  return x;",
    "  // docatlas:end:body",
    "}",
  ].join("\n");

  it("extracts the lines strictly between start and end markers", () => {
    expect(extractRegion(file, "body")).toBe("const x = 1;\nreturn x;");
  });

  it("dedents the extracted region to its common indentation", () => {
    const result = extractRegion(file, "body");
    expect(result.startsWith("const")).toBe(true);
  });

  it("throws when the start marker is missing", () => {
    expect(() => extractRegion(file, "missing")).toThrow(SnippetExtractionError);
  });

  it("throws when the end marker is missing", () => {
    const noEnd = "// docatlas:start:x\ncode\n";
    expect(() => extractRegion(noEnd, "x")).toThrow(/no "docatlas:end:x"/);
  });

  it("matches regions regardless of comment syntax", () => {
    const pyFile = "# docatlas:start:r\nvalue = 1\n# docatlas:end:r\n";
    expect(extractRegion(pyFile, "r")).toBe("value = 1");
  });

  it("does not confuse a region name that is a prefix of another", () => {
    const file2 = [
      "// docatlas:start:setup",
      "a",
      "// docatlas:end:setup",
      "// docatlas:start:setup2",
      "b",
      "// docatlas:end:setup2",
    ].join("\n");
    expect(extractRegion(file2, "setup")).toBe("a");
  });
});

describe("extractLineRange", () => {
  const file = ["one", "two", "three", "four"].join("\n");

  it("extracts an inclusive 1-indexed line range", () => {
    expect(extractLineRange(file, 2, 3)).toBe("two\nthree");
  });

  it("extracts a single line", () => {
    expect(extractLineRange(file, 1, 1)).toBe("one");
  });

  it("throws for a start below 1", () => {
    expect(() => extractLineRange(file, 0, 2)).toThrow(SnippetExtractionError);
  });

  it("throws when end is before start", () => {
    expect(() => extractLineRange(file, 3, 2)).toThrow(SnippetExtractionError);
  });

  it("throws when the range exceeds the file length", () => {
    expect(() => extractLineRange(file, 1, 100)).toThrow(/exceeds file length/);
  });
});

describe("dedent behavior via extractRegion", () => {
  it("strips shared leading whitespace but preserves relative indentation", () => {
    const file = [
      "// docatlas:start:r",
      "    if (x) {",
      "      doThing();",
      "    }",
      "// docatlas:end:r",
    ].join("\n");
    expect(extractRegion(file, "r")).toBe("if (x) {\n  doThing();\n}");
  });

  it("ignores blank lines when computing the shared indent", () => {
    const file = [
      "// docatlas:start:r",
      "  a",
      "",
      "  b",
      "// docatlas:end:r",
    ].join("\n");
    expect(extractRegion(file, "r")).toBe("a\n\nb");
  });
});
