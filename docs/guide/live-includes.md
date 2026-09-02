---
title: Live Includes
---

# Live Includes

A fenced code block can pull its content live from the real source tree
instead of being hand-typed (and hand-forgotten) into the markdown file.

## Syntax

Write a normal fenced code block, add an `include="path/to/file.ts"`
attribute after the language on the opening fence line, and leave the body
empty. The opening fence line looks like three backticks, the language
name, then the include attribute — with nothing but the closing fence on
the line after it.

The fence body **must be empty** — docatlas fails the build if it isn't,
because the entire point is that this text is never independently
maintained. Three forms of `include` are supported:

- `include="file.ts"` — the whole file.
- `include="file.ts#region-name"` — the lines between a
  `docatlas:start:region-name` and `docatlas:end:region-name` marker pair,
  matched regardless of the host language's comment syntax (`//`, `#`, `--`,
  ...).
- `include="file.ts:12-30"` — an inclusive 1-indexed line range.

Extracted regions are dedented to their common indentation, so a region
nested three levels deep in the real file still reads naturally in the
docs.

## A real region, included live

This is docatlas's own region-extraction function, pulled from
`src/snippets/extractor.ts` at build time — if that function's signature or
body ever changes, this page changes with it automatically on the next
build, and there is nothing to remember to update by hand.

```ts include="src/snippets/extractor.ts#extract-region"
```

## What happens on a miss

If the named region or line range doesn't exist in the target file, or the
target file itself is missing, `docatlas build` and `docatlas check` report
a snippet error with the page, the file, and the reason, and exit non-zero.
See the [CLI reference](../reference/cli.md) for exit code details.
