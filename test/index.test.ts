import { describe, expect, it } from "vitest";
import * as docatlas from "../src/index.js";

describe("public API surface", () => {
  it("exports the markdown parsing entry points", () => {
    expect(typeof docatlas.parseMarkdown).toBe("function");
    expect(typeof docatlas.parseInline).toBe("function");
  });

  it("exports the snippet extraction entry points", () => {
    expect(typeof docatlas.extractRegion).toBe("function");
    expect(typeof docatlas.resolveSnippets).toBe("function");
  });

  it("exports the link checker", () => {
    expect(typeof docatlas.checkLinks).toBe("function");
  });

  it("exports the search pipeline", () => {
    expect(typeof docatlas.tokenize).toBe("function");
    expect(typeof docatlas.stem).toBe("function");
    expect(typeof docatlas.buildIndex).toBe("function");
    expect(typeof docatlas.search).toBe("function");
  });

  it("exports the site build pipeline", () => {
    expect(typeof docatlas.buildSite).toBe("function");
    expect(typeof docatlas.renderBlocks).toBe("function");
  });
});
