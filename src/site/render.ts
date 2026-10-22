import type { Block, InlineNode } from "../types.js";

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Maps a source-level href (e.g. `./guide/x.md#y`) to the href written into the HTML. */
export type HrefRewriter = (href: string) => string;

const identity: HrefRewriter = (href) => href;

function renderInline(nodes: readonly InlineNode[], rewrite: HrefRewriter): string {
  return nodes
    .map((node) => {
      switch (node.type) {
        case "text":
          return escapeHtml(node.value);
        case "code":
          return `<code>${escapeHtml(node.value)}</code>`;
        case "strong":
          return `<strong>${renderInline(node.children, rewrite)}</strong>`;
        case "em":
          return `<em>${renderInline(node.children, rewrite)}</em>`;
        case "link":
          return `<a href="${escapeHtml(rewrite(node.href))}">${renderInline(node.children, rewrite)}</a>`;
      }
    })
    .join("");
}

export function renderBlocks(blocks: readonly Block[], rewrite: HrefRewriter = identity): string {
  const out: string[] = [];
  for (const block of blocks) {
    switch (block.type) {
      case "heading":
        out.push(
          `<h${block.level} id="${escapeHtml(block.slug)}">${escapeHtml(block.text)}</h${block.level}>`,
        );
        break;
      case "paragraph":
        out.push(`<p>${renderInline(block.children, rewrite)}</p>`);
        break;
      case "blockquote":
        out.push(`<blockquote>${renderInline(block.children, rewrite)}</blockquote>`);
        break;
      case "hr":
        out.push("<hr>");
        break;
      case "list": {
        const tag = block.ordered ? "ol" : "ul";
        const items = block.items.map((it) => `<li>${renderInline(it, rewrite)}</li>`).join("");
        out.push(`<${tag}>${items}</${tag}>`);
        break;
      }
      case "code-fence": {
        const langClass = block.lang ? ` class="language-${escapeHtml(block.lang)}"` : "";
        const liveBadge = block.include
          ? `<div class="live-badge" title="Injected live from ${escapeHtml(block.include.file)} at build time">live: ${escapeHtml(block.include.file)}</div>`
          : "";
        out.push(
          `<div class="code-block">${liveBadge}<pre><code${langClass}>${escapeHtml(block.lines.join("\n"))}</code></pre></div>`,
        );
        break;
      }
    }
  }
  return out.join("\n");
}

/** Flattens a page's blocks to plain text, used to build the search index. */
export function blocksToPlainText(blocks: readonly Block[]): string {
  const parts: string[] = [];
  for (const block of blocks) {
    switch (block.type) {
      case "heading":
        parts.push(block.text);
        break;
      case "paragraph":
      case "blockquote":
        parts.push(inlineToText(block.children));
        break;
      case "list":
        for (const item of block.items) parts.push(inlineToText(item));
        break;
      case "code-fence":
        parts.push(block.lines.join(" "));
        break;
      case "hr":
        break;
    }
  }
  return parts.join(" ");
}

function inlineToText(nodes: readonly InlineNode[]): string {
  return nodes
    .map((n) => {
      if (n.type === "text" || n.type === "code") return n.value;
      return inlineToText(n.children);
    })
    .join("");
}
