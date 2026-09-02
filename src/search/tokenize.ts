/**
 * Shared tokenizer: the exact same function builds the server-side inverted
 * index and runs client-side at query time (this module ships unmodified as
 * a browser asset), so index terms and query terms are always comparable.
 */

const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "if", "then", "else", "for", "to",
  "of", "in", "on", "at", "is", "are", "was", "were", "be", "been", "being",
  "it", "its", "this", "that", "these", "those", "with", "as", "by", "from",
  "into", "about", "so", "than", "too", "very", "can", "will", "just",
]);

/**
 * A deliberately small suffix-stripping stemmer ("stemming-lite"): it folds
 * common plural and verb-inflection suffixes so that "indexing", "indexed"
 * and "indexes" all collapse to the same term as "index" without pulling in
 * a full Porter/Snowball implementation. It is conservative — it only fires
 * on tokens long enough that stripping still leaves a plausible stem — so it
 * trades perfect linguistic accuracy for predictability.
 */
/**
 * True when `stem` ends in a doubled consonant that was almost certainly
 * introduced by an -ing/-ed suffix ("stopping" -> "stopp") rather than being
 * native to the word ("install", "pass"). Mirrors Porter's own carve-out:
 * never undouble a trailing l, s or z.
 */
function shouldUndouble(stem: string): boolean {
  return /([bcdfgjkmnpqrtvwxyz])\1$/.test(stem);
}

export function stem(term: string): string {
  let t = term;

  if (t.length > 4 && t.endsWith("ies")) {
    t = t.slice(0, -3) + "y";
  } else if (t.length > 4 && t.endsWith("es") && /[sxz]es$|[cs]hes$/.test(t)) {
    t = t.slice(0, -2);
  } else if (t.length > 3 && t.endsWith("s") && !t.endsWith("ss")) {
    t = t.slice(0, -1);
  }

  if (t.length > 5 && t.endsWith("ing")) {
    const stem = t.slice(0, -3);
    t = shouldUndouble(stem) ? stem.slice(0, -1) : stem;
  } else if (t.length > 4 && t.endsWith("ed") && !t.endsWith("eed")) {
    const stem = t.slice(0, -2);
    t = shouldUndouble(stem) ? stem.slice(0, -1) : stem;
  }

  return t;
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9_]+/i)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t))
    .map(stem);
}
