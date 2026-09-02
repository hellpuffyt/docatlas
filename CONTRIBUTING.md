# Contributing to docatlas

Thanks for considering a contribution. docatlas is a small, deliberately
scoped project — a documentation engine, not a general markdown processor —
so the bar for new surface area is "does this keep code samples and links
from going stale," not "is this a nice-to-have feature."

## Setup

```sh
git clone https://github.com/hellpuffyt/docatlas.git
cd docatlas
npm install
```

## Everyday commands

```sh
npm run build      # compile src/ to dist/
npm run typecheck   # tsc --noEmit over src and test
npm run lint         # eslint over src and test
npm test              # vitest run
npm run coverage    # vitest run --coverage
```

All four must be clean before a pull request is merged; CI runs all four on
every push and pull request, plus a dogfood check that builds this
project's own docs with the `docatlas` binary it just compiled (see
`docs/guide/dogfooding.md`).

## Before you open a PR

- Add tests for new behavior — new src files should not lower overall
  coverage. `npm run coverage` reports per-file numbers.
- Keep `docatlas check docs --source .` passing if you touch `docs/` or add
  a live-include target under `src/`; that's exactly what CI runs.
- Run `npm run lint` — the project targets zero warnings, not just zero
  errors.
- Prefer adding a focused test over a broad one; the existing test files
  under `test/` mirror `src/`'s module layout and are meant as the pattern
  to follow.

## Project layout

See `docs/architecture.md` (built from this very repository) for the module
map and the pipeline each `docatlas build` invocation runs through.

## Reporting a bug

Open an issue with the smallest markdown + source-file pair that reproduces
it, and which subcommand (`build`, `check`, `serve`, `search`) you ran.
