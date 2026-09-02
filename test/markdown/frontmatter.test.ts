import { describe, expect, it } from "vitest";
import { extractFrontMatter } from "../../src/markdown/frontmatter.js";

describe("extractFrontMatter", () => {
  it("returns empty front matter when there is no delimiter", () => {
    const { frontMatter, body } = extractFrontMatter("# Hello\n");
    expect(frontMatter).toEqual({});
    expect(body).toBe("# Hello\n");
  });

  it("parses simple key: value pairs", () => {
    const src = "---\ntitle: Getting Started\ndescription: intro page\n---\n# Body\n";
    const { frontMatter, body } = extractFrontMatter(src);
    expect(frontMatter["title"]).toBe("Getting Started");
    expect(frontMatter["description"]).toBe("intro page");
    expect(body).toBe("# Body\n");
  });

  it("strips matching double quotes from values", () => {
    const { frontMatter } = extractFrontMatter('---\ntitle: "Quoted Title"\n---\nbody');
    expect(frontMatter["title"]).toBe("Quoted Title");
  });

  it("strips matching single quotes from values", () => {
    const { frontMatter } = extractFrontMatter("---\ntitle: 'Quoted'\n---\nbody");
    expect(frontMatter["title"]).toBe("Quoted");
  });

  it("ignores lines without a colon", () => {
    const { frontMatter } = extractFrontMatter("---\nnotakeyvalue\ntitle: X\n---\nbody");
    expect(frontMatter).toEqual({ title: "X" });
  });

  it("treats an unterminated front-matter block as plain body", () => {
    const src = "---\ntitle: X\nno closing fence";
    const { frontMatter, body } = extractFrontMatter(src);
    expect(frontMatter).toEqual({});
    expect(body).toBe(src);
  });

  it("handles a document that is only the opening delimiter", () => {
    const { frontMatter, body } = extractFrontMatter("---");
    expect(frontMatter).toEqual({});
    expect(body).toBe("---");
  });
});
