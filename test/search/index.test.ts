import { describe, expect, it } from "vitest";
import { buildIndex } from "../../src/search/index.js";

describe("buildIndex", () => {
  it("builds an empty index for no documents", () => {
    const index = buildIndex([]);
    expect(index.docs).toEqual([]);
    expect(index.avgDocLength).toBe(0);
    expect(index.postings).toEqual({});
  });

  it("records document metadata in insertion order", () => {
    const index = buildIndex([
      { id: "a", title: "A", url: "a.html", text: "alpha beta" },
      { id: "b", title: "B", url: "b.html", text: "gamma" },
    ]);
    expect(index.docs.map((d) => d.id)).toEqual(["a", "b"]);
  });

  it("builds real postings lists (term -> doc index + frequency), not a text blob", () => {
    const index = buildIndex([
      { id: "a", title: "A", url: "a.html", text: "search index search" },
    ]);
    expect(index.postings["search"]).toEqual([[0, 2]]);
    expect(index.postings["index"]).toEqual([[0, 1]]);
  });

  it("does not create a postings entry for a term absent from every document", () => {
    const index = buildIndex([{ id: "a", title: "A", url: "a.html", text: "only this" }]);
    expect(index.postings["missing"]).toBeUndefined();
  });

  it("tracks which documents share a term across the corpus", () => {
    const index = buildIndex([
      { id: "a", title: "A", url: "a.html", text: "common word" },
      { id: "b", title: "B", url: "b.html", text: "common other" },
    ]);
    expect(index.postings["common"]?.map(([docIdx]) => docIdx)).toEqual([0, 1]);
  });

  it("computes the average document length across the corpus in tokens", () => {
    const index = buildIndex([
      { id: "a", title: "A", url: "a.html", text: "one two" },
      { id: "b", title: "B", url: "b.html", text: "one two three four" },
    ]);
    expect(index.avgDocLength).toBe(3);
  });

  it("applies the same tokenizer/stemmer used at query time when indexing", () => {
    const index = buildIndex([{ id: "a", title: "A", url: "a.html", text: "running fast" }]);
    expect(index.postings["run"]).toEqual([[0, 1]]);
  });
});
