---
title: docatlas
---

# docatlas

Documentation rots in one specific, avoidable way: the code sample in a
tutorial keeps its own life once it's pasted in, and the function it was
copied from moves on without it. **docatlas** is a documentation site engine
built around the idea that this should be a build error, not a slow-motion
lie.

Three things make that true:

- **Live code samples.** A fenced code block can `include` a real file, a
  named region inside it, or a line range — the markdown source is empty,
  the content is injected from the real source tree at build time. See
  [Live includes](./guide/live-includes.md).
- **A dead-link build failure.** Every internal link and every heading
  anchor — same-page or cross-page — is resolved against the real page
  graph. A broken one fails `docatlas build` and `docatlas check`. See
  [Link checking](./guide/link-checking.md).
- **A real search index.** Not `.includes()` over page text — a compile-time
  inverted index, BM25-ranked, with a small stemmer so "indexing" and
  "index" are the same term. See [Search](./guide/search.md).

## Quickstart

```sh
npm install -g docatlas
docatlas build docs --source . --out site --title "My Project"
docatlas serve site
```

## This site

This documentation is built by docatlas itself — see
[Dogfooding docatlas](./guide/dogfooding.md) for how, and the
[CLI reference](./reference/cli.md) for every command and flag.

Read the [Architecture](./architecture.md) page for how the pieces fit
together end to end.
