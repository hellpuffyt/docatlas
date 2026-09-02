/** Shared types used across the docatlas pipeline. */

export interface FrontMatter {
  readonly title?: string;
  readonly [key: string]: string | undefined;
}

export type InlineNode =
  | { readonly type: "text"; readonly value: string }
  | { readonly type: "code"; readonly value: string }
  | { readonly type: "strong"; readonly children: InlineNode[] }
  | { readonly type: "em"; readonly children: InlineNode[] }
  | {
      readonly type: "link";
      readonly href: string;
      readonly children: InlineNode[];
      /** 1-indexed source line, for pinpointing broken-link errors. */
      readonly line: number;
    };

export interface Heading {
  readonly type: "heading";
  readonly level: 1 | 2 | 3 | 4 | 5 | 6;
  readonly text: string;
  readonly slug: string;
  readonly line: number;
}

export interface Paragraph {
  readonly type: "paragraph";
  readonly children: InlineNode[];
  readonly line: number;
}

export interface ListNode {
  readonly type: "list";
  readonly ordered: boolean;
  readonly items: InlineNode[][];
  readonly line: number;
}

export interface Blockquote {
  readonly type: "blockquote";
  readonly children: InlineNode[];
  readonly line: number;
}

export interface ThematicBreak {
  readonly type: "hr";
  readonly line: number;
}

/** A fenced code block, optionally sourced live from the real source tree. */
export interface CodeFence {
  readonly type: "code-fence";
  readonly lang: string;
  /** Raw info-string content after the language, e.g. `include="src/a.ts#region"`. */
  readonly meta: string;
  readonly lines: string[];
  readonly line: number;
  readonly include?: IncludeDirective;
}

export interface IncludeDirective {
  /** Path to the source file, relative to the configured source root. */
  readonly file: string;
  /** Named region delimited by `docatlas:start:NAME` / `docatlas:end:NAME` markers. */
  readonly region?: string;
  /** Inclusive 1-indexed line range. */
  readonly lineRange?: { readonly start: number; readonly end: number };
}

export type Block =
  | Heading
  | Paragraph
  | ListNode
  | Blockquote
  | ThematicBreak
  | CodeFence;

export interface ParsedDocument {
  readonly frontMatter: FrontMatter;
  readonly blocks: Block[];
}

/** A resolved documentation page, ready to render and to check. */
export interface Page {
  readonly id: string;
  /** Path relative to the docs root, e.g. "guide/setup.md". */
  readonly sourcePath: string;
  readonly title: string;
  readonly blocks: Block[];
  readonly headingSlugs: ReadonlySet<string>;
  readonly outgoingLinks: readonly PageLink[];
  /** Plain-text extraction of the page body, used for the search index. */
  readonly plainText: string;
}

export interface PageLink {
  readonly href: string;
  readonly line: number;
}

export interface LinkError {
  readonly page: string;
  readonly href: string;
  readonly line: number;
  readonly reason: string;
}

export interface SnippetError {
  readonly page: string;
  readonly file: string;
  readonly line: number;
  readonly reason: string;
}

export interface BuildResult {
  readonly pages: readonly Page[];
  readonly linkErrors: readonly LinkError[];
  readonly snippetErrors: readonly SnippetError[];
  readonly outDir: string;
}
