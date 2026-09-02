import type { FrontMatter } from "../types.js";

/**
 * Splits off a leading `---` delimited front-matter block and parses its
 * `key: value` lines. Not a YAML parser (no nesting, no lists) — front
 * matter in docatlas is metadata (title, description), not data.
 */
export function extractFrontMatter(source: string): {
  frontMatter: FrontMatter;
  body: string;
  headerLines: number;
} {
  if (!source.startsWith("---\n") && source !== "---") {
    return { frontMatter: {}, body: source, headerLines: 0 };
  }

  const lines = source.split("\n");
  let end = -1;
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i] === "---") {
      end = i;
      break;
    }
  }

  if (end === -1) {
    return { frontMatter: {}, body: source, headerLines: 0 };
  }

  const frontMatter: Record<string, string> = {};
  for (const line of lines.slice(1, end)) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key.length > 0) frontMatter[key] = value;
  }

  const body = lines.slice(end + 1).join("\n");
  return { frontMatter, body, headerLines: end + 1 };
}
