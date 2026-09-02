/**
 * Browser entry point for the generated site's search box. This file is
 * compiled to plain ESM JS and shipped as a static asset alongside
 * search-index.json; it imports the *exact same* tokenizer and BM25 ranker
 * used to build the index server-side (search/tokenize.ts, search/bm25.ts),
 * so there is exactly one scoring implementation, not a client copy that
 * can drift from the server one.
 */
import { search, type SearchIndex } from "../../search/bm25.js";

declare global {
  interface Window {
    __docatlasSearchIndexUrl?: string;
    __docatlasRootPrefix?: string;
  }
}

function debounce<T extends (...args: never[]) => void>(fn: T, ms: number): T {
  let handle: ReturnType<typeof setTimeout> | undefined;
  return ((...args: Parameters<T>) => {
    if (handle) clearTimeout(handle);
    handle = setTimeout(() => fn(...args), ms);
  }) as T;
}

export function initSearch(
  input: HTMLInputElement,
  results: HTMLElement,
  indexUrl: string,
  /**
   * Path prefix from the current page back to the site root, e.g. "../../".
   * Every result's URL in the index is root-relative (e.g. "guide/x.html"),
   * so it needs this prefix to resolve correctly from a page nested inside
   * a subdirectory, exactly like the index URL itself.
   */
  rootPrefix = "",
): void {
  let index: SearchIndex | undefined;

  const load = async (): Promise<SearchIndex> => {
    if (!index) {
      const res = await fetch(indexUrl);
      index = (await res.json()) as SearchIndex;
    }
    return index;
  };

  const run = async (): Promise<void> => {
    const query = input.value.trim();
    results.innerHTML = "";
    if (query.length === 0) return;

    const idx = await load();
    const hits = search(idx, query, 8);

    if (hits.length === 0) {
      const li = document.createElement("li");
      li.className = "search-empty";
      li.textContent = "No results.";
      results.appendChild(li);
      return;
    }

    for (const hit of hits) {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = rootPrefix + hit.url;
      a.textContent = hit.title;
      const score = document.createElement("span");
      score.className = "search-score";
      score.textContent = hit.score.toFixed(2);
      li.appendChild(a);
      li.appendChild(score);
      results.appendChild(li);
    }
  };

  input.addEventListener("input", debounce(() => void run(), 120));
}

// Auto-wire when loaded directly on a generated page.
if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    const input = document.getElementById("search-input");
    const results = document.getElementById("search-results");
    const indexUrl = window.__docatlasSearchIndexUrl ?? "./search-index.json";
    const rootPrefix = window.__docatlasRootPrefix ?? "";
    if (input instanceof HTMLInputElement && results instanceof HTMLElement) {
      initSearch(input, results, indexUrl, rootPrefix);
    }
  });
}
