import type { InlineNode } from "../types.js";

/**
 * Parses inline markdown (text, `code`, **strong**, *em*, [links](href)) into a node tree.
 * Deliberately small: docatlas targets documentation prose, not the full CommonMark inline grammar.
 */
export function parseInline(text: string, line: number): InlineNode[] {
  const nodes: InlineNode[] = [];
  let buf = "";
  let i = 0;

  const flush = (): void => {
    if (buf.length > 0) {
      nodes.push({ type: "text", value: buf });
      buf = "";
    }
  };

  while (i < text.length) {
    const ch = text[i];

    if (ch === "`") {
      const end = text.indexOf("`", i + 1);
      if (end !== -1) {
        flush();
        nodes.push({ type: "code", value: text.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }

    if (ch === "*" && text[i + 1] === "*") {
      const end = text.indexOf("**", i + 2);
      if (end !== -1) {
        flush();
        nodes.push({ type: "strong", children: parseInline(text.slice(i + 2, end), line) });
        i = end + 2;
        continue;
      }
    }

    if (ch === "*") {
      const end = text.indexOf("*", i + 1);
      if (end !== -1 && end > i + 1) {
        flush();
        nodes.push({ type: "em", children: parseInline(text.slice(i + 1, end), line) });
        i = end + 1;
        continue;
      }
    }

    if (ch === "[") {
      const closeBracket = text.indexOf("]", i + 1);
      if (closeBracket !== -1 && text[closeBracket + 1] === "(") {
        const closeParen = text.indexOf(")", closeBracket + 2);
        if (closeParen !== -1) {
          flush();
          const label = text.slice(i + 1, closeBracket);
          const href = text.slice(closeBracket + 2, closeParen);
          nodes.push({ type: "link", href, children: parseInline(label, line), line });
          i = closeParen + 1;
          continue;
        }
      }
    }

    buf += ch;
    i += 1;
  }

  flush();
  return nodes;
}

/** Flattens an inline tree back to plain text, e.g. for the search index or link labels. */
export function inlineToPlainText(nodes: readonly InlineNode[]): string {
  let out = "";
  for (const node of nodes) {
    switch (node.type) {
      case "text":
      case "code":
        out += node.value;
        break;
      case "strong":
      case "em":
        out += inlineToPlainText(node.children);
        break;
      case "link":
        out += inlineToPlainText(node.children);
        break;
    }
  }
  return out;
}

/** Collects every link in an inline tree, including links nested inside strong/em. */
export function collectLinks(
  nodes: readonly InlineNode[],
): { href: string; line: number }[] {
  const links: { href: string; line: number }[] = [];
  for (const node of nodes) {
    if (node.type === "link") {
      links.push({ href: node.href, line: node.line });
      links.push(...collectLinks(node.children));
    } else if (node.type === "strong" || node.type === "em") {
      links.push(...collectLinks(node.children));
    }
  }
  return links;
}
