# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Fixed

- Links in the generated HTML now point at the generated `.html` files. The
  checker accepted `./guide/x.md`, but the page was written with that href
  verbatim, so every cross-page link in a built site was a 404 (including
  11 in this project's own docs).
- Links that climb above the docs root are dead links instead of being
  clamped back to the root.
- `include=` paths that resolve outside `--source` are refused.
- `docatlas serve` answers 400 to malformed percent-encoding instead of
  crashing, and binds `127.0.0.1` only.
- Quickstart: `docatlas` is not on npm; README and docs now build from a
  clone.
- CI workflow token restricted to `contents: read`; non-major dev-dependency
  audit fixes.

### Added

- `test/site/output-links.test.ts`: crawls the built HTML (a fixture site and
  this repo's own docs) and fails on any unresolvable relative link.
- `SECURITY.md`, `.editorconfig`, `docs/PRODUCTION_READINESS.md`.

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
