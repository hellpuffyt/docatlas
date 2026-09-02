import { describe, expect, it } from "vitest";
import { buildIndex } from "../../src/search/index.js";
import { search } from "../../src/search/bm25.js";

const CORPUS = buildIndex([
  { id: "install", title: "Installation", url: "install.html", text: "Install docatlas with npm install -g docatlas." },
  { id: "search", title: "Search", url: "search.html", text: "Search runs on a real inverted index with BM25 ranking, not substring matching." },
  { id: "links", title: "Link Checking", url: "links.html", text: "Broken internal links and heading anchors fail the build." },
]);

describe("search (BM25 ranking)", () => {
  it("returns an empty result set for an empty or all-stopword query", () => {
    expect(search(CORPUS, "", 10)).toEqual([]);
    expect(search(CORPUS, "the a", 10)).toEqual([]);
  });

  it("ranks the document containing the query term above unrelated documents", () => {
    const results = search(CORPUS, "index", 10);
    expect(results[0]?.id).toBe("search");
  });

  it("returns no results for a term present in no document", () => {
    expect(search(CORPUS, "xylophone", 10)).toEqual([]);
  });

  it("respects the topK limit", () => {
    const results = search(CORPUS, "the", 1);
    expect(results.length).toBeLessThanOrEqual(1);
  });

  it("matches a query term against a stemmed form indexed from a different inflection", () => {
    // "install" (query) should match "Install" / "install" tokens already stemmed identically
    const results = search(CORPUS, "installing", 10);
    expect(results.map((r) => r.id)).toContain("install");
  });

  it("orders multiple hits by descending score", () => {
    const results = search(CORPUS, "link build", 10);
    for (let i = 1; i < results.length; i += 1) {
      expect(results[i - 1]!.score).toBeGreaterThanOrEqual(results[i]!.score);
    }
  });

  it("returns each hit's id, title, url and a numeric score", () => {
    const [hit] = search(CORPUS, "search", 1);
    expect(hit).toMatchObject({ id: "search", title: "Search", url: "search.html" });
    expect(typeof hit?.score).toBe("number");
  });

  it("scores a multi-term query using terms present in only some documents", () => {
    const results = search(CORPUS, "docatlas ranking", 10);
    expect(results.map((r) => r.id).sort()).toEqual(["install", "search"]);
  });
});
