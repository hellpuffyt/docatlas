import { describe, expect, it } from "vitest";
import { renderPage, renderStyle } from "../../src/site/template.js";

describe("renderPage", () => {
  const base = {
    siteTitle: "Docs",
    title: "Getting Started",
    bodyHtml: "<p>hi</p>",
    nav: [
      { href: "index.html", title: "Home" },
      { href: "guide.html", title: "Guide" },
    ],
    currentHref: "guide.html",
    rootPrefix: "",
  };

  it("includes the page title and site title in <title>", () => {
    expect(renderPage(base)).toContain("<title>Getting Started · Docs</title>");
  });

  it("marks the current nav entry with aria-current", () => {
    const html = renderPage(base);
    expect(html).toContain('href="guide.html" aria-current="page"');
  });

  it("does not mark non-current nav entries", () => {
    const html = renderPage(base);
    expect(html).not.toContain('href="index.html" aria-current="page"');
  });

  it("includes the search input and results container", () => {
    const html = renderPage(base);
    expect(html).toContain('id="search-input"');
    expect(html).toContain('id="search-results"');
  });

  it("includes a theme toggle button", () => {
    expect(renderPage(base)).toContain('id="theme-toggle"');
  });

  it("embeds the provided body HTML inside <main>", () => {
    expect(renderPage(base)).toContain("<main class=\"content\"><p>hi</p></main>");
  });

  it("escapes an untrusted title before writing it into the HTML", () => {
    const html = renderPage({ ...base, title: '<img src=x onerror=alert(1)>' });
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img");
  });

  it("references the search index and compiled search client script", () => {
    const html = renderPage(base);
    expect(html).toContain("search-index.json");
    expect(html).toContain("search-client.js");
  });

  it("prefixes the stylesheet, script and nav links with rootPrefix for a nested page", () => {
    const html = renderPage({ ...base, rootPrefix: "../../" });
    expect(html).toContain('href="../../assets/style.css"');
    expect(html).toContain('src="../../assets/js/site/browser/search-client.js"');
    expect(html).toContain('href="../../index.html"');
    expect(html).toContain('href="../../guide.html"');
  });

  it("exposes the root prefix and search index URL as page globals", () => {
    const html = renderPage({ ...base, rootPrefix: "../" });
    expect(html).toContain('window.__docatlasRootPrefix = "../";');
    expect(html).toContain('window.__docatlasSearchIndexUrl = "../assets/search-index.json";');
  });

  it("uses no prefix at all for a root-level page", () => {
    const html = renderPage(base);
    expect(html).toContain('href="assets/style.css"');
    expect(html).toContain('window.__docatlasRootPrefix = "";');
  });
});

describe("renderStyle", () => {
  it("defines both a light (:root) and dark ([data-theme=dark]) palette", () => {
    const css = renderStyle();
    expect(css).toContain(":root {");
    expect(css).toContain(':root[data-theme="dark"]');
  });

  it("respects the OS-level color scheme when no explicit theme is stored", () => {
    expect(renderStyle()).toContain("prefers-color-scheme: dark");
  });

  it("styles the sidebar, search box and live-include badge", () => {
    const css = renderStyle();
    expect(css).toContain(".sidebar");
    expect(css).toContain(".search-results");
    expect(css).toContain(".live-badge");
  });

  it("stacks the sidebar above the content on narrow viewports", () => {
    const css = renderStyle();
    const narrow = css.slice(css.indexOf("@media (max-width: 48rem)"));
    expect(narrow).toContain("@media (max-width: 48rem)");
    expect(narrow).toMatch(/\.body-row \{ flex-direction: column; \}/);
    expect(narrow).toMatch(/\.sidebar \{ width: auto;/);
    // flex children default to min-width:auto, which lets a wide code block
    // push the page wider than the viewport
    expect(css).toContain(".content { min-width: 0; }");
  });
});
