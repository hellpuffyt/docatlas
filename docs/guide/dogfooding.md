---
title: Dogfooding docatlas
---

# Dogfooding docatlas

This documentation site — the one you're reading — is built with docatlas
itself, and CI fails the build if it ever goes stale. There is no separate
"real" docs pipeline that this project happens to also ship a tool for.

## The build

```sh
docatlas build docs --source . --out docs-site --title docatlas
```

`docs/` is this markdown tree. `--source .` points snippet includes at the
repository root, so a fence like
`include="src/search/bm25.ts#bm25-search"` (used on the
[Search](./search.md) page) resolves against the actual `src/` directory
that ships in this repository, not a frozen copy.

## The CI check

The project's CI workflow runs `docatlas check docs --source .` — the same
validation `build` does (every include resolves, every link and anchor
resolves) without writing a persistent `docs-site/` directory, so a broken
include or a dead link in this very file would fail the pull request that
introduced it. See [Link checking](./link-checking.md) and
[Live includes](./live-includes.md) for what "resolves" means in each case.

## Why this matters

A documentation engine that doesn't run its own medicine is an easy tool to
stop trusting the first time its own docs and its own behavior disagree.
Dogfooding closes that gap by construction: if this page's claims about
docatlas were wrong, the build would already have failed.
