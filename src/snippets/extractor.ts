/**
 * Pulls a snippet of real source text out of a file's content, either by a
 * named marker region (`docatlas:start:NAME` ... `docatlas:end:NAME`,
 * matched regardless of comment syntax) or by an inclusive 1-indexed line
 * range. Throws with a precise reason on any miss — the caller turns that
 * into a build-failing SnippetError.
 */

export class SnippetExtractionError extends Error {}

function startMarker(name: string): RegExp {
  return new RegExp(`docatlas:start:${escapeRegExp(name)}\\b`);
}
function endMarker(name: string): RegExp {
  return new RegExp(`docatlas:end:${escapeRegExp(name)}\\b`);
}
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// docatlas:start:extract-region
export function extractRegion(fileContent: string, regionName: string): string {
  const lines = fileContent.split("\n");
  const startRe = startMarker(regionName);
  const endRe = endMarker(regionName);

  const startIdx = lines.findIndex((l) => startRe.test(l));
  if (startIdx === -1) {
    throw new SnippetExtractionError(`no "docatlas:start:${regionName}" marker found`);
  }
  const endIdx = lines.findIndex((l, idx) => idx > startIdx && endRe.test(l));
  if (endIdx === -1) {
    throw new SnippetExtractionError(`no "docatlas:end:${regionName}" marker found`);
  }

  const body = lines.slice(startIdx + 1, endIdx);
  return dedent(body).join("\n");
}
// docatlas:end:extract-region

export function extractLineRange(
  fileContent: string,
  start: number,
  end: number,
): string {
  const lines = fileContent.split("\n");
  if (start < 1 || end < start) {
    throw new SnippetExtractionError(`invalid line range ${start}-${end}`);
  }
  if (end > lines.length) {
    throw new SnippetExtractionError(
      `line range ${start}-${end} exceeds file length (${lines.length} lines)`,
    );
  }
  return dedent(lines.slice(start - 1, end)).join("\n");
}

/** Strips the common leading whitespace shared by every non-blank line. */
function dedent(lines: string[]): string[] {
  let minIndent = Infinity;
  for (const line of lines) {
    if (line.trim() === "") continue;
    const indent = line.length - line.trimStart().length;
    if (indent < minIndent) minIndent = indent;
  }
  if (!Number.isFinite(minIndent) || minIndent === 0) return lines;
  return lines.map((l) => (l.trim() === "" ? l : l.slice(minIndent)));
}
