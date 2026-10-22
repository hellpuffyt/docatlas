---
title: Production Readiness
---

# Production readiness

Tested commit: `ff3a871` (audit/production-readiness; this page was added in
the following docs-only commit). Date: 2026-10-22. This page is part of the
docs tree, so docatlas checks and builds it like any other page.

## Scope and architecture

docatlas parses a directory of markdown, resolves `include=` code fences
against a source tree, checks every internal link and heading anchor against
the parsed page graph, builds a BM25 search index, and writes a static site.
CLI: `build`, `check`, `serve` (local preview), `search`.

## Platforms and prerequisites

- Node >= 18 (`engines`); CI runs Node 20 on Linux/Windows/macOS and Node 22
  on Linux. Verified locally on macOS 27 (Apple M5), Node 24.19.0, npm 11.17.0.
  Windows was not run locally.
- No network or services needed.

## Clean-clone verification

| Step | Exit / result |
|---|---|
| `npm install` | 0 |
| `npm run build` | 0 |
| `node dist/cli.js build docs --source . --out site --title "My Project"` | 0, 7 pages |
| `node dist/cli.js serve site` + GET a nested page | 200 on `127.0.0.1:4173`; stopped afterwards |
| `node dist/cli.js check docs --source .` | 0 |
| Add a page with `[x](./nope.md)`, then `build` / `check` | both exit 1 with `link error: broken-probe.md:3 "./nope.md"` |
| `npm run typecheck`, `lint`, `test`, `coverage` | all 0; 199 tests at that commit (200 after the include fix) |
| `node dist/cli.js search site/assets/search-index.json bm25` | ranked hits |

`npm link` from the README was not run (it modifies the global npm prefix on
a shared machine); `node dist/cli.js` was used instead, as the README allows.

## Commands and results (CI steps)

| Check | Command | Before | After |
|---|---|---|---|
| Install | `npm ci` | 0 | 0 |
| Typecheck | `npm run typecheck` | 0 | 0 |
| Lint | `npm run lint` | 0 | 0 |
| Build | `npm run build` | 0 | 0 |
| Tests + coverage | `npm run coverage` | 0 — 193 passed | 0 — 200 passed, 0 failed, 0 skipped; statements ~97.6% |
| Dogfood check | `node dist/cli.js check docs --source . --title docatlas` | 0 | 0 |
| Dogfood build | `node dist/cli.js build docs --source . --out docs-site --title docatlas` | 0, but 11 hrefs pointed at `.md` files absent from the output | 0, zero `.md` hrefs; crawl test finds no broken links |
| Browser render | `serve` + headless Chromium: click a cross-page link, type a search query | — | navigation works, ranked results shown, no console errors, no other-origin requests |
| Runtime dependency audit | `npm audit --omit=dev` | 0 (no runtime deps) | 0 |
| Full audit | `npm audit` | dev-only critical/high (vitest 2 chain) | brace-expansion, source-map-js fixed; the vitest chain needs vitest 5, not done |

## CI status

Default branch: success (latest `main` run). Audit branch: pending until pushed.

## Bugs found and fixed

1. **Checked links were broken in the built site.** The renderer wrote
   `./guide/x.md` verbatim while the site contains `guide/x.html`, so every
   cross-page link 404'd after a "passing" build. Fixed by rewriting resolved
   links to the generated file, relative to the linking page. Regression:
   `test/site/output-links.test.ts` crawls the output.
2. **Links above the docs root were accepted** (`../index.md` from the root
   page resolved to `index.md`). Now dead links.
3. **`include=` could read outside `--source`.** Now refused (build fails).
4. **`serve` crashed on malformed percent-encoding** and listened on all
   interfaces. Now 400 and `127.0.0.1`.
5. **Quickstart referenced an unpublished npm package** (`npm install -g
   docatlas` returns 404). Now builds from a clone.

## Security review

- Secret scan of tree and full history: no hits.
- HTML escaping of text, code, headings, titles and hrefs is in place; search
  results are inserted with `textContent`.
- Path containment: `serve` (pre-existing guard plus the decode fix) and
  `include=` (new).
- Markdown is treated as trusted author input: a `javascript:` href is
  reported as a dead link, so it only reaches the output with
  `--allow-broken-links`.
- CI token now `contents: read`; actions pinned to tags (unchanged).

## Known limitations

- The markdown parser is deliberately small: no images, no reference-style
  links, no link titles, no raw HTML. An image or a titled link is reported
  as a dead link rather than silently rendered wrong.
- Percent-encoded or query-string links to pages are reported as dead (false
  positive, fails safe).
- `build` exits 1 on errors but still writes the output directory; gate
  deployment on the exit code.
- Remaining dev-only advisories need vitest 5.

## Acceptance checklist

| # | Item | Expected | Command / test | Result | Reference |
|---|---|---|---|---|---|
| 1 | Dead page link fails build and check | exit 1, one line per error | clean-clone probe, `test/cli.test.ts` | pass | `src/links/checker.ts`, `src/cli.ts` |
| 2 | Dead anchor fails | exit 1 | `test/links/checker.test.ts` | pass | `src/links/checker.ts` |
| 3 | Links in the built HTML resolve | crawl finds nothing broken | `output-links.test.ts` | pass | `src/site/build.ts` |
| 4 | Own docs build clean | dogfood check + crawl | CI dogfood job, `output-links.test.ts` | pass | `docs/` |
| 5 | Root-escaping links fail | dead link | `output-links.test.ts` | pass | `src/links/checker.ts` |
| 6 | Live includes resolve or fail | missing file/region is an error | `test/snippets/*` | pass | `src/snippets/` |
| 7 | Includes stay inside `--source` | refused | `test/site/build.test.ts` | pass | `src/site/build.ts` |
| 8 | BM25 search works in CLI and browser | ranked hits | `test/search/*`, browser render | pass | `src/search/` |
| 9 | `serve` is safe for local preview | traversal 403, bad encoding 400, loopback | `test/cli.test.ts` | pass | `src/cli.ts` |

## Classification proposal

**READY FOR DOCUMENTED SCOPE** (proposal; pending audit-branch CI and the
lead's independent verification).
