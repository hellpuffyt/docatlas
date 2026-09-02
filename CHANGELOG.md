# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.1.0] - 2026-09-02

### Added

- Markdown parser targeting documentation prose (`markdown/`): front matter,
  headings with de-duplicated GitHub-style slugs, paragraphs, ordered and
  unordered lists (with lazy line-wrap continuation), blockquotes, thematic
  breaks, fenced code, and inline text/code/strong/em/links.
- Live code includes (`snippets/`): a fenced code block can pull its content
  from a real source file, a named `docatlas:start:NAME` / `docatlas:end:NAME`
  region, or an inclusive line range — resolved against the real source tree
  at build time, failing the build on a miss.
- A dead-link and dead-anchor checker (`links/checker.ts`) that resolves
  every relative link and every same-page/cross-page heading anchor against
  the full parsed page graph.
- A real compile-time inverted search index (`search/`): a shared
  tokenizer with a lightweight suffix-stripping stemmer, an inverted index
  builder, and Okapi BM25 ranking — the same ranking module runs server-side
  (`docatlas search`) and ships unmodified as the browser search asset.
- A static site generator (`site/`) with a polished default theme: sidebar
  navigation, dark/light theme tokens (explicit toggle plus
  `prefers-color-scheme`), a live search box, and a "live" badge on any code
  block sourced from a real file.
- A CLI (`docatlas build|check|serve|search`) with a `check` command that
  runs the full build pipeline against a temporary output directory for
  CI use, and a `serve` command with a path-traversal-safe static file
  handler.
- This project's own documentation (`docs/`), built with `docatlas` itself
  and validated by `docatlas check` in CI — see `docs/guide/dogfooding.md`.
- 190+ tests across every module (`vitest`), including a jsdom-based suite
  for the in-browser search client, with ~97% statement coverage.

[0.1.0]: https://github.com/hellpuffyt/docatlas/releases/tag/v0.1.0
