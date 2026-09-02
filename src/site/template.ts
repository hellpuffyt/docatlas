export interface NavEntry {
  readonly href: string;
  readonly title: string;
}

export interface PageTemplateOptions {
  readonly siteTitle: string;
  readonly title: string;
  readonly bodyHtml: string;
  readonly nav: readonly NavEntry[];
  /** Root-relative path of the page being rendered, e.g. "guide/setup.html". */
  readonly currentHref: string;
  /**
   * Path prefix from this page back to the site root, e.g. "../../" for a
   * page two directories deep, or "" at the root. Every nav link and asset
   * reference is written relative to the page's own directory (rather than
   * a fixed "./assets/..."), so the same generated HTML works both nested
   * three directories deep and served from a sub-path — not just at the
   * site root.
   */
  readonly rootPrefix: string;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function renderPage(options: PageTemplateOptions): string {
  const { siteTitle, title, bodyHtml, nav, currentHref, rootPrefix } = options;
  const navHtml = nav
    .map(
      (entry) =>
        `<li><a href="${escapeHtml(rootPrefix + entry.href)}"${entry.href === currentHref ? ' aria-current="page"' : ""}>${escapeHtml(entry.title)}</a></li>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} · ${escapeHtml(siteTitle)}</title>
<link rel="stylesheet" href="${escapeHtml(rootPrefix)}assets/style.css">
</head>
<body>
<div class="layout">
  <header class="topbar">
    <span class="site-title">${escapeHtml(siteTitle)}</span>
    <div class="search-box">
      <input id="search-input" type="search" placeholder="Search docs..." aria-label="Search documentation" autocomplete="off">
      <ul id="search-results" class="search-results"></ul>
    </div>
    <button id="theme-toggle" type="button" aria-label="Toggle color theme">◐</button>
  </header>
  <div class="body-row">
    <nav class="sidebar"><ul>${navHtml}</ul></nav>
    <main class="content">${bodyHtml}</main>
  </div>
</div>
<script>
window.__docatlasSearchIndexUrl = "${escapeHtml(rootPrefix)}assets/search-index.json";
window.__docatlasRootPrefix = "${escapeHtml(rootPrefix)}";
(function () {
  var stored = null;
  try { stored = localStorage.getItem("docatlas-theme"); } catch (e) {}
  if (stored) document.documentElement.setAttribute("data-theme", stored);
  document.addEventListener("DOMContentLoaded", function () {
    var btn = document.getElementById("theme-toggle");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var current = document.documentElement.getAttribute("data-theme");
      var next = current === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem("docatlas-theme", next); } catch (e) {}
    });
  });
})();
</script>
<script type="module" src="${escapeHtml(rootPrefix)}assets/js/site/browser/search-client.js"></script>
</body>
</html>
`;
}

export function renderStyle(): string {
  return `:root {
  --bg: #ffffff;
  --bg-alt: #f6f7f9;
  --fg: #1a1d23;
  --fg-muted: #5c6370;
  --border: #e2e5ea;
  --accent: #3a5ccc;
  --code-bg: #f0f2f6;
  --live-bg: #eaf3ea;
  --live-fg: #256a2f;
}
:root[data-theme="dark"] {
  --bg: #14161a;
  --bg-alt: #1b1e24;
  --fg: #e7e9ee;
  --fg-muted: #9aa1ad;
  --border: #2a2e37;
  --accent: #7f9dff;
  --code-bg: #1f232b;
  --live-bg: #17301c;
  --live-fg: #7fd08a;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #14161a;
    --bg-alt: #1b1e24;
    --fg: #e7e9ee;
    --fg-muted: #9aa1ad;
    --border: #2a2e37;
    --accent: #7f9dff;
    --code-bg: #1f232b;
    --live-bg: #17301c;
    --live-fg: #7fd08a;
  }
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--fg);
  font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif;
  line-height: 1.6;
}
.layout { display: flex; flex-direction: column; min-height: 100vh; }
.topbar {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1.25rem;
  border-bottom: 1px solid var(--border);
  background: var(--bg-alt);
  position: sticky;
  top: 0;
  z-index: 10;
}
.site-title { font-weight: 700; font-size: 1.05rem; }
.search-box { position: relative; flex: 1; max-width: 24rem; }
#search-input {
  width: 100%;
  padding: 0.4rem 0.6rem;
  border: 1px solid var(--border);
  border-radius: 0.4rem;
  background: var(--bg);
  color: var(--fg);
}
.search-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin: 0.25rem 0 0;
  padding: 0.25rem;
  list-style: none;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 0.4rem;
  max-height: 20rem;
  overflow-y: auto;
}
.search-results:empty { display: none; }
.search-results li { display: flex; justify-content: space-between; padding: 0.3rem 0.4rem; border-radius: 0.3rem; }
.search-results li:hover { background: var(--bg-alt); }
.search-score { color: var(--fg-muted); font-size: 0.8rem; }
.search-empty { color: var(--fg-muted); }
#theme-toggle {
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--fg);
  border-radius: 0.4rem;
  padding: 0.3rem 0.6rem;
  cursor: pointer;
}
.body-row { display: flex; flex: 1; }
.sidebar {
  width: 15rem;
  flex-shrink: 0;
  border-right: 1px solid var(--border);
  padding: 1rem;
  background: var(--bg-alt);
}
.sidebar ul { list-style: none; margin: 0; padding: 0; }
.sidebar li { margin-bottom: 0.25rem; }
.sidebar a { color: var(--fg-muted); text-decoration: none; display: block; padding: 0.3rem 0.5rem; border-radius: 0.3rem; }
.sidebar a:hover { background: var(--bg); color: var(--fg); }
.sidebar a[aria-current="page"] { background: var(--accent); color: white; }
.content { flex: 1; padding: 1.5rem 2rem; max-width: 48rem; }
.content h1, .content h2, .content h3 { line-height: 1.3; }
.content a { color: var(--accent); }
.code-block { margin: 1rem 0; border: 1px solid var(--border); border-radius: 0.5rem; overflow: hidden; }
.code-block pre { margin: 0; padding: 0.9rem 1rem; overflow-x: auto; background: var(--code-bg); }
.live-badge {
  font-size: 0.75rem;
  padding: 0.25rem 0.75rem;
  background: var(--live-bg);
  color: var(--live-fg);
  border-bottom: 1px solid var(--border);
}
code { font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace; }
p code { background: var(--code-bg); padding: 0.1rem 0.3rem; border-radius: 0.25rem; }
blockquote { margin: 1rem 0; padding: 0.25rem 1rem; border-left: 3px solid var(--border); color: var(--fg-muted); }
.index-list { padding-left: 1.2rem; }
`;
}
