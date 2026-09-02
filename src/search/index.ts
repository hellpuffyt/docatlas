import { tokenize } from "./tokenize.js";

export interface IndexedDoc {
  readonly id: string;
  readonly title: string;
  readonly url: string;
  readonly text: string;
}

/** A real inverted index: term -> (docIndex -> term frequency in that doc). */
export interface SearchIndex {
  readonly docs: { id: string; title: string; url: string; length: number }[];
  /** term -> [[docIndex, frequency], ...] */
  readonly postings: Record<string, [number, number][]>;
  readonly avgDocLength: number;
}

/** Builds a real inverted index (not a scan-every-string substring search). */
export function buildIndex(docs: readonly IndexedDoc[]): SearchIndex {
  const postingsMap = new Map<string, Map<number, number>>();
  const docMeta: SearchIndex["docs"] = [];
  let totalLength = 0;

  docs.forEach((doc, docIndex) => {
    const terms = tokenize(doc.text);
    docMeta.push({ id: doc.id, title: doc.title, url: doc.url, length: terms.length });
    totalLength += terms.length;

    for (const term of terms) {
      let postings = postingsMap.get(term);
      if (!postings) {
        postings = new Map();
        postingsMap.set(term, postings);
      }
      postings.set(docIndex, (postings.get(docIndex) ?? 0) + 1);
    }
  });

  const postings: Record<string, [number, number][]> = {};
  for (const [term, byDoc] of postingsMap) {
    postings[term] = [...byDoc.entries()];
  }

  return {
    docs: docMeta,
    postings,
    avgDocLength: docMeta.length > 0 ? totalLength / docMeta.length : 0,
  };
}
