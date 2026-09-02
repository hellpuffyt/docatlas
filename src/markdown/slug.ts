/** Deterministic GitHub-style heading slugs, with de-duplication per document. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[`*_~]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Returns a slug unique among `used`, appending -1, -2, ... on collision (GitHub's scheme). */
export function uniqueSlug(text: string, used: Map<string, number>): string {
  const base = slugify(text) || "section";
  const count = used.get(base) ?? 0;
  used.set(base, count + 1);
  return count === 0 ? base : `${base}-${count}`;
}
