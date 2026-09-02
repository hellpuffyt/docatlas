---
title: CLI Reference
---

# CLI Reference

## docatlas build

```sh
docatlas build <docsDir> --source <sourceDir> --out <outDir> [--title <title>] [--allow-broken-links]
```

Parses every markdown file under `<docsDir>`, resolves every live include
against `<sourceDir>`, checks every internal link and heading anchor,
writes a static HTML site plus a compiled search index to `<outDir>`, and
exits non-zero if any snippet or link error was found (unless
`--allow-broken-links` is passed, which downgrades link errors to
warnings — snippet errors still fail the build either way).

- `--source <dir>` — root that `include="..."` paths are resolved against.
  Defaults to the current directory.
- `--out <dir>` — output directory. Defaults to `site`.
- `--title <title>` — site title shown in the top bar and page `<title>`.
  Defaults to "Documentation".
- `--allow-broken-links` — report dead links as warnings instead of failing
  the build. Snippet errors (missing includes, missing regions) always fail.

## docatlas check

```sh
docatlas check <docsDir> --source <sourceDir> [--title <title>]
```

Runs the exact same parsing, snippet resolution, and link/anchor validation
as `build`, without writing a persistent output directory — the write goes
to a temporary directory that is cleaned up before the command returns.
This is the form CI should use: it validates the docs tree is internally
consistent without leaving build artifacts to commit or clean up. See
[Dogfooding docatlas](../guide/dogfooding.md) for how this project uses it
on its own docs.

## docatlas serve

```sh
docatlas serve <outDir> [--port <port>]
```

Serves a directory previously produced by `docatlas build` over plain HTTP,
for local preview. Defaults to port 4173. Fails immediately if `<outDir>`
does not exist, rather than starting a server with nothing to serve.

## docatlas search

```sh
docatlas search <indexJsonPath> <query> [--top <n>]
```

Runs a query against a `search-index.json` produced by `docatlas build` and
prints ranked hits (score, title, URL) to the terminal — the same BM25
ranker described in [Search](../guide/search.md), usable without a browser.

## Exit codes

Every subcommand returns `0` on success and `1` on any reported error
(missing arguments, an unresolved snippet, a broken link with the default
settings, an unknown command). Scripts and CI can rely on this without
parsing output.
