---
title: Architecture
---

# Architecture

docatlas is a straight-line pipeline, not a plugin graph — every stage is a
pure function of the stage before it, which is what makes `docatlas check`
able to validate a docs tree without ever touching disk beyond reading
source files.

```
markdown files
      │
      ▼
 parseMarkdown ──► ParsedDocument (front matter + Block[])
      │
      ▼
resolveSnippets ──► live "include=" fences resolved against --source,
      │              or a SnippetError per unresolved one
      ▼
   Page[] ──► headingSlugs, outgoingLinks, plainText per page
      │
      ├──► checkLinks ──► LinkError[] (dead links / dead anchors)
      │
      ├──► buildIndex ──► inverted index (search/index.ts)
      │
      └──► renderBlocks + renderPage ──► static HTML per page
```

## Module map

- `markdown/` — a small hand-written parser (`parser.ts`, `inline.ts`,
  `frontmatter.ts`, `slug.ts`) targeting documentation prose, not the full
  CommonMark grammar. Headings, paragraphs, lists, blockquotes, thematic
  breaks, fenced code, and inline text/code/strong/em/links.
- `snippets/` — `extractor.ts` pulls a region or line range out of raw file
  text; `resolver.ts` walks a page's blocks, finds `include`-tagged fences,
  and replaces their (required-empty) body with real source content.
- `links/checker.ts` — resolves every link and anchor against the full page
  graph after every page has been parsed, so cross-page anchor checks have
  every page's heading slugs available.
- `search/` — `tokenize.ts` (shared tokenizer + stemmer, see
  [Search](./guide/search.md)), `index.ts` (inverted index builder),
  `bm25.ts` (ranking — the same module is compiled to a browser asset for
  the in-page search box, so there is one scoring implementation, not two).
- `site/` — `render.ts` (blocks to HTML), `template.ts` (page shell, nav,
  dark/light theme tokens, the search box markup), `build.ts` (orchestrates
  the whole pipeline end to end and writes the output directory).
- `cli.ts` — `build` / `check` / `serve` / `search` subcommands over that
  same pipeline.

## Why link checking happens after every page is parsed

A cross-page anchor check (`other.md#heading`) needs `other.md`'s heading
slugs, which only exist once `other.md` itself has been parsed. So
`buildSite` parses and snippet-resolves every page into a `Page[]` first,
then runs `checkLinks` once over the whole graph — not per-page as each
file is read.

## Why `check` doesn't need `build`'s output directory

`docatlas check` calls the same `buildSite` function `docatlas build` does,
pointed at a temporary directory that's removed before the command returns.
The validation (snippet resolution, link/anchor checking) happens as a side
effect of building; there's no separate "just validate" code path to drift
out of sync with what `build` actually does.
