import type { Block, CodeFence, IncludeDirective, ParsedDocument } from "../types.js";
import { extractFrontMatter } from "./frontmatter.js";
import { parseInline } from "./inline.js";
import { uniqueSlug } from "./slug.js";

const FENCE_RE = /^```(\S*)(.*)$/;
const HEADING_RE = /^(#{1,6})\s+(.*)$/;
const HR_RE = /^(-{3,}|\*{3,}|_{3,})\s*$/;
const LIST_RE = /^(\s*)([-*]|\d+\.)\s+(.*)$/;
const BLOCKQUOTE_RE = /^>\s?(.*)$/;

/** Parses `include="path[#region|:start-end]"` out of a fence's info string. */
export function parseIncludeMeta(meta: string): IncludeDirective | undefined {
  const match = /include\s*=\s*"([^"]+)"/.exec(meta);
  if (!match) return undefined;
  const raw = match[1] ?? "";

  const hashIdx = raw.indexOf("#");
  const colonIdx = raw.indexOf(":", raw.lastIndexOf("/") + 1);

  if (hashIdx !== -1) {
    return { file: raw.slice(0, hashIdx), region: raw.slice(hashIdx + 1) };
  }
  if (colonIdx !== -1) {
    const rangeStr = raw.slice(colonIdx + 1);
    const rangeMatch = /^(\d+)-(\d+)$/.exec(rangeStr);
    if (rangeMatch) {
      return {
        file: raw.slice(0, colonIdx),
        lineRange: { start: Number(rangeMatch[1]), end: Number(rangeMatch[2]) },
      };
    }
  }
  return { file: raw };
}

export function parseMarkdown(source: string): ParsedDocument {
  const { frontMatter, body } = extractFrontMatter(source);
  const lines = body.split("\n");
  const blocks: Block[] = [];
  const usedSlugs = new Map<string, number>();

  let i = 0;
  while (i < lines.length) {
    const rawLine = lines[i] ?? "";
    const line = rawLine;
    const lineNo = i + 1;

    if (line.trim() === "") {
      i += 1;
      continue;
    }

    const fenceMatch = FENCE_RE.exec(line);
    if (fenceMatch) {
      const lang = fenceMatch[1] ?? "";
      const meta = (fenceMatch[2] ?? "").trim();
      const fenceLines: string[] = [];
      let j = i + 1;
      while (j < lines.length && lines[j] !== "```") {
        fenceLines.push(lines[j] ?? "");
        j += 1;
      }
      const include = parseIncludeMeta(meta);
      const fence: CodeFence = {
        type: "code-fence",
        lang,
        meta,
        lines: fenceLines,
        line: lineNo,
        ...(include ? { include } : {}),
      };
      blocks.push(fence);
      i = j + 1;
      continue;
    }

    const headingMatch = HEADING_RE.exec(line);
    if (headingMatch) {
      const level = (headingMatch[1] ?? "#").length as 1 | 2 | 3 | 4 | 5 | 6;
      const text = (headingMatch[2] ?? "").trim();
      blocks.push({
        type: "heading",
        level,
        text,
        slug: uniqueSlug(text, usedSlugs),
        line: lineNo,
      });
      i += 1;
      continue;
    }

    if (HR_RE.test(line)) {
      blocks.push({ type: "hr", line: lineNo });
      i += 1;
      continue;
    }

    const blockquoteMatch = BLOCKQUOTE_RE.exec(line);
    if (blockquoteMatch) {
      const contentLines = [blockquoteMatch[1] ?? ""];
      let j = i + 1;
      while (j < lines.length) {
        const m = BLOCKQUOTE_RE.exec(lines[j] ?? "");
        if (!m) break;
        contentLines.push(m[1] ?? "");
        j += 1;
      }
      blocks.push({
        type: "blockquote",
        children: parseInline(contentLines.join(" "), lineNo),
        line: lineNo,
      });
      i = j;
      continue;
    }

    const listMatch = LIST_RE.exec(line);
    if (listMatch) {
      const ordered = /\d/.test(listMatch[2] ?? "");
      const items: string[] = [listMatch[3] ?? ""];
      let j = i + 1;
      while (j < lines.length) {
        const next = lines[j] ?? "";
        const m = LIST_RE.exec(next);
        if (m) {
          items.push(m[3] ?? "");
          j += 1;
          continue;
        }
        // Lazy continuation: a wrapped line belonging to the current item,
        // as long as it doesn't start a new block of its own.
        if (
          next.trim() !== "" &&
          !FENCE_RE.test(next) &&
          !HEADING_RE.test(next) &&
          !HR_RE.test(next) &&
          !BLOCKQUOTE_RE.test(next)
        ) {
          items[items.length - 1] += ` ${next.trim()}`;
          j += 1;
          continue;
        }
        break;
      }
      blocks.push({
        type: "list",
        ordered,
        items: items.map((it) => parseInline(it, lineNo)),
        line: lineNo,
      });
      i = j;
      continue;
    }

    // Paragraph: consume until a blank line or a line that starts a new block type.
    const paraLines = [line];
    let j = i + 1;
    while (
      j < lines.length &&
      (lines[j] ?? "").trim() !== "" &&
      !FENCE_RE.test(lines[j] ?? "") &&
      !HEADING_RE.test(lines[j] ?? "") &&
      !HR_RE.test(lines[j] ?? "") &&
      !BLOCKQUOTE_RE.test(lines[j] ?? "") &&
      !LIST_RE.test(lines[j] ?? "")
    ) {
      paraLines.push(lines[j] ?? "");
      j += 1;
    }
    blocks.push({
      type: "paragraph",
      children: parseInline(paraLines.join(" "), lineNo),
      line: lineNo,
    });
    i = j;
  }

  return { frontMatter, blocks };
}
