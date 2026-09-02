import { describe, expect, it } from "vitest";
import { stem, tokenize } from "../../src/search/tokenize.js";

describe("tokenize", () => {
  it("lowercases and splits on non-alphanumeric characters", () => {
    expect(tokenize("Hello, World!")).toEqual(["hello", "world"]);
  });

  it("drops common stopwords", () => {
    expect(tokenize("the quick and the dead")).toEqual(["quick", "dead"]);
  });

  it("drops single-character tokens", () => {
    expect(tokenize("a b cc")).toEqual(["cc"]);
  });

  it("keeps underscores as part of a token", () => {
    expect(tokenize("my_variable name")).toEqual(["my_variable", "name"]);
  });

  it("returns an empty array for an empty string", () => {
    expect(tokenize("")).toEqual([]);
  });

  it("stems plural nouns and inflected verbs to the same term as their base form", () => {
    expect(tokenize("indexing indexed indexes index")).toEqual(["index", "index", "index", "index"]);
  });
});

describe("stem", () => {
  it("strips a simple plural s", () => {
    expect(stem("links")).toBe("link");
  });

  it("does not strip a double s", () => {
    expect(stem("class")).toBe("class");
  });

  it("turns -ies into -y", () => {
    expect(stem("queries")).toBe("query");
  });

  it("strips -es after a sibilant ending", () => {
    expect(stem("matches")).toBe("match");
  });

  it("strips -ing and undoes consonant doubling", () => {
    expect(stem("running")).toBe("run");
  });

  it("strips -ing without doubled consonants", () => {
    expect(stem("building")).toBe("build");
  });

  it("strips -ed and undoes consonant doubling", () => {
    expect(stem("stopped")).toBe("stop");
  });

  it("does not strip -eed (would break 'agreed'-like words the wrong way)", () => {
    expect(stem("agreed")).toBe("agreed");
  });

  it("leaves short words alone", () => {
    expect(stem("is")).toBe("is");
    expect(stem("as")).toBe("as");
  });
});
