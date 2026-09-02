---
title: Link Checking
---

# Link Checking

Every relative link and every heading anchor in the docs tree is resolved
against the real page graph at build time. There is no separate "check my
links" step to remember to run — `docatlas build` does it, and by default
a broken one fails the build.

## What gets checked

- **Relative page links** — `./guide.md`, `../index.md`, and so on — are
  resolved against the linking page's own directory, exactly like a
  filesystem path, and matched against every page docatlas actually parsed.
  A link to `guide.html` resolves back to `guide.md` too, since that's what
  the generated site serves.
- **Same-page anchors** — `#some-heading` — are checked against the heading
  slugs docatlas generated for that page.
- **Cross-page anchors** — `other-page.md#some-heading` — are checked
  against the target page's own heading slugs, not just its existence.
- **External links** (`https://...`, `mailto:...`) are left alone; docatlas
  checks the docs tree it owns, not the internet.

## Heading slugs

Slugs follow GitHub's own scheme: lowercase, punctuation stripped, spaces
turned into hyphens, and a per-page `-1`, `-2`, ... suffix on a duplicate
heading text. So a second `## Setup` on the same page is `#setup-1`, not a
silent collision with the first.

## Failing the build

```sh
docatlas build docs --source . --out site
```

exits non-zero and prints one line per broken reference:

```
link error: guide/setup.md:12 "../overview.md#instalation" - page "overview.md" has no heading "#instalation"
```

Pass `--allow-broken-links` to downgrade these to warnings during local
iteration — CI should never pass that flag. `docatlas check` runs the same
validation without writing a persistent output directory, which is the form
this project's own CI uses (see
[Dogfooding docatlas](./dogfooding.md)).
