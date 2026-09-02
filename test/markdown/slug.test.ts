import { describe, expect, it } from "vitest";
import { slugify, uniqueSlug } from "../../src/markdown/slug.js";

describe("slugify", () => {
  it("lowercases and hyphenates words", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("strips markdown emphasis markers", () => {
    expect(slugify("**Bold** and *Italic*")).toBe("bold-and-italic");
  });

  it("strips punctuation that is not a hyphen", () => {
    expect(slugify("What's New?!")).toBe("whats-new");
  });

  it("collapses repeated whitespace into one hyphen", () => {
    expect(slugify("a    b")).toBe("a-b");
  });

  it("collapses repeated hyphens into one", () => {
    expect(slugify("a---b")).toBe("a-b");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugify("-hello-")).toBe("hello");
  });

  it("preserves digits", () => {
    expect(slugify("Section 2.1")).toBe("section-21");
  });

  it("returns empty string for pure punctuation", () => {
    expect(slugify("***")).toBe("");
  });
});

describe("uniqueSlug", () => {
  it("returns the base slug on first use", () => {
    const used = new Map<string, number>();
    expect(uniqueSlug("Overview", used)).toBe("overview");
  });

  it("appends -1 on first collision", () => {
    const used = new Map<string, number>();
    uniqueSlug("Overview", used);
    expect(uniqueSlug("Overview", used)).toBe("overview-1");
  });

  it("increments across repeated collisions", () => {
    const used = new Map<string, number>();
    uniqueSlug("Overview", used);
    uniqueSlug("Overview", used);
    expect(uniqueSlug("Overview", used)).toBe("overview-2");
  });

  it("falls back to 'section' for an empty slug", () => {
    const used = new Map<string, number>();
    expect(uniqueSlug("***", used)).toBe("section");
  });
});
