// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { buildIndex } from "../../src/search/index.js";
import { initSearch } from "../../src/site/browser/search-client.js";

const INDEX = buildIndex([
  { id: "a", title: "Installation", url: "install.html", text: "install docatlas with npm" },
  { id: "b", title: "Search", url: "search.html", text: "search runs on an inverted index" },
]);

function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 150));
}

describe("initSearch (browser search box)", () => {
  let input: HTMLInputElement;
  let results: HTMLUListElement;

  beforeEach(() => {
    document.body.innerHTML = '<input id="search-input"><ul id="search-results"></ul>';
    input = document.getElementById("search-input") as HTMLInputElement;
    results = document.getElementById("search-results") as HTMLUListElement;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ json: () => Promise.resolve(INDEX) }),
    );
    initSearch(input, results, "/assets/search-index.json");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders no results for an empty query", async () => {
    input.value = "";
    input.dispatchEvent(new Event("input"));
    await flush();
    expect(results.children.length).toBe(0);
  });

  it("fetches the index lazily on first query and renders ranked hits", async () => {
    input.value = "search";
    input.dispatchEvent(new Event("input"));
    await flush();
    expect(fetch).toHaveBeenCalledWith("/assets/search-index.json");
    expect(results.querySelector("a")?.textContent).toBe("Search");
  });

  it("only fetches the index once across repeated queries", async () => {
    input.value = "search";
    input.dispatchEvent(new Event("input"));
    await flush();
    input.value = "install";
    input.dispatchEvent(new Event("input"));
    await flush();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("shows a 'no results' item for a query that matches nothing", async () => {
    input.value = "xylophone";
    input.dispatchEvent(new Event("input"));
    await flush();
    expect(results.querySelector(".search-empty")?.textContent).toBe("No results.");
  });

  it("renders a score alongside each result link", async () => {
    input.value = "install";
    input.dispatchEvent(new Event("input"));
    await flush();
    expect(results.querySelector(".search-score")).not.toBeNull();
  });

  it("prefixes a result's href with the root prefix so it resolves from a nested page", async () => {
    document.body.innerHTML = '<input id="search-input"><ul id="search-results"></ul>';
    const nestedInput = document.getElementById("search-input") as HTMLInputElement;
    const nestedResults = document.getElementById("search-results") as HTMLUListElement;
    initSearch(nestedInput, nestedResults, "/assets/search-index.json", "../../");

    nestedInput.value = "search";
    nestedInput.dispatchEvent(new Event("input"));
    await flush();
    expect(nestedResults.querySelector("a")?.getAttribute("href")).toBe("../../search.html");
  });

  it("clears previous results before rendering a new query's results", async () => {
    input.value = "search";
    input.dispatchEvent(new Event("input"));
    await flush();
    input.value = "";
    input.dispatchEvent(new Event("input"));
    await flush();
    expect(results.children.length).toBe(0);
  });
});
