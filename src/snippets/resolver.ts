import type { Block, CodeFence, SnippetError } from "../types.js";
import { extractLineRange, extractRegion, SnippetExtractionError } from "./extractor.js";

const EXT_TO_LANG: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  py: "python",
  rs: "rust",
  go: "go",
  sh: "bash",
  json: "json",
  md: "markdown",
  yml: "yaml",
  yaml: "yaml",
  toml: "toml",
  css: "css",
  html: "html",
};

function inferLang(file: string): string {
  const ext = file.split(".").pop() ?? "";
  return EXT_TO_LANG[ext] ?? ext;
}

/**
 * Resolves every `include`-tagged code fence in `blocks` against real files,
 * read via `readSource`. A fence with an `include` directive must be empty
 * in the markdown source itself — the whole point is that the shown code is
 * never hand-copied, only ever injected live from the source tree, so it
 * cannot drift out of sync with it.
 */
export function resolveSnippets(
  blocks: readonly Block[],
  pagePath: string,
  readSource: (relPath: string) => string | undefined,
): { blocks: Block[]; errors: SnippetError[] } {
  const errors: SnippetError[] = [];
  const resolved: Block[] = [];

  for (const block of blocks) {
    if (block.type !== "code-fence" || !block.include) {
      resolved.push(block);
      continue;
    }

    const fence: CodeFence = block;
    const { include } = fence;

    if (fence.lines.some((l) => l.trim() !== "")) {
      errors.push({
        page: pagePath,
        file: include!.file,
        line: fence.line,
        reason:
          "include fences must be empty in the markdown source; content is injected live at build time",
      });
      resolved.push(fence);
      continue;
    }

    const content = readSource(include!.file);
    if (content === undefined) {
      errors.push({
        page: pagePath,
        file: include!.file,
        line: fence.line,
        reason: `source file not found: ${include!.file}`,
      });
      resolved.push(fence);
      continue;
    }

    try {
      let snippet: string;
      if (include!.region) {
        snippet = extractRegion(content, include!.region);
      } else if (include!.lineRange) {
        snippet = extractLineRange(content, include!.lineRange.start, include!.lineRange.end);
      } else {
        snippet = content.replace(/\n$/, "");
      }
      resolved.push({
        ...fence,
        lang: fence.lang || inferLang(include!.file),
        lines: snippet.split("\n"),
      });
    } catch (err) {
      const reason = err instanceof SnippetExtractionError ? err.message : String(err);
      errors.push({ page: pagePath, file: include!.file, line: fence.line, reason });
      resolved.push(fence);
    }
  }

  return { blocks: resolved, errors };
}
