import type { SearchIndex } from "./index.js";
import { tokenize } from "./tokenize.js";

export type { SearchIndex } from "./index.js";

export interface SearchResult {
  readonly id: string;
  readonly title: string;
  readonly url: string;
  readonly score: number;
}

const K1 = 1.5;
const B = 0.75;

/**
 * Okapi BM25 ranking over the inverted index built by `buildIndex`. This is
 * the same function used server-side (e.g. `docatlas search`) and shipped
 * as a browser asset for the generated site's search box — real relevance
 * ranking, not `.includes()` over page text.
 */
// docatlas:start:bm25-search
export function search(index: SearchIndex, query: string, topK = 10): SearchResult[] {
  const terms = tokenize(query);
  if (terms.length === 0) return [];

  const n = index.docs.length;
  const scores = new Map<number, number>();

  for (const term of terms) {
    const postings = index.postings[term];
    if (!postings || postings.length === 0) continue;

    const df = postings.length;
    const idf = Math.log((n - df + 0.5) / (df + 0.5) + 1);

    for (const [docIndex, freq] of postings) {
      const doc = index.docs[docIndex];
      if (!doc) continue;
      const lengthNorm = 1 - B + B * (doc.length / (index.avgDocLength || 1));
      const termScore = (idf * (freq * (K1 + 1))) / (freq + K1 * lengthNorm);
      scores.set(docIndex, (scores.get(docIndex) ?? 0) + termScore);
    }
  }

  return [...scores.entries()]
    .map(([docIndex, score]) => {
      const doc = index.docs[docIndex];
      if (!doc) throw new Error(`invalid doc index ${docIndex} in search index`);
      return { id: doc.id, title: doc.title, url: doc.url, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
// docatlas:end:bm25-search
