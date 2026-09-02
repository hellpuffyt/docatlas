---
title: Search
---

# Search

The search box on every generated page is backed by a real inverted index
built at compile time, ranked with Okapi BM25 — not a client-side scan of
page text with `.includes()`.

## Indexing

At build time, docatlas tokenizes every page's plain-text body: lowercase,
split on non-alphanumeric characters, drop a small stopword list, drop
single-character tokens, then apply a lightweight suffix-stripping stemmer
so that "indexing", "indexed", "indexes" and "index" all collapse to the
same term. The result is a real inverted index — term to `(document,
frequency)` postings — written to `assets/search-index.json` alongside the
generated pages.

## Ranking

Query terms are tokenized with the exact same function used to build the
index, then scored with Okapi BM25 against the postings list:

```ts include="src/search/bm25.ts#bm25-search"
```

The browser search box (`src/site/browser/search-client.ts`) imports this
same module unmodified and ships it as a static asset — there is exactly
one scoring implementation, used both by `docatlas search` on the command
line and by the in-page search UI, so they can never silently drift apart.

## From the command line

```sh
docatlas search site/assets/search-index.json "live include"
```

prints ranked hits with their BM25 score, title and URL — useful for
sanity-checking relevance without opening a browser.
