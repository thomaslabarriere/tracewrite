// Pure text utilities shared by extraction and verification.

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "of", "to", "in", "on", "at", "for",
  "with", "by", "from", "as", "is", "are", "was", "were", "be", "been", "being",
  "this", "that", "these", "those", "it", "its", "was", "than", "versus", "vs",
  "compared", "comparison", "study", "trial", "patients", "patient", "group",
  "arm", "arms", "was", "were", "had", "has", "have", "who", "which", "their",
  "there", "when", "while", "also", "more", "most", "less", "least", "over",
  "during", "between", "among", "into", "about", "after", "before",
]);

/** Lowercase word tokens, punctuation stripped. Unicode-aware so accented
 * characters (café, Sørensen, naïve) tokenize correctly. */
export function tokenize(text: string): string[] {
  return (
    text.toLowerCase().match(/[\p{L}\p{N}]+(?:[.-][\p{L}\p{N}]+)*/gu) ?? []
  ).filter((t) => t.length > 0);
}

/** Content tokens: drop stopwords and very short tokens (but keep numbers). */
export function contentTokens(text: string): string[] {
  return tokenize(text).filter(
    (t) => (/\d/.test(t) || t.length > 2) && !STOPWORDS.has(t),
  );
}

/**
 * Extract numeric tokens as normalized strings, e.g. "62%", "0.61", "18.4",
 * "months". Percentages, decimals, hazard ratios and p-values all matter for
 * scientific claims, so numbers are treated as high-signal.
 */
export function numericTokens(text: string): string[] {
  const out: string[] = [];
  // Standalone numbers only. A digit glued to a letter is an identifier
  // (a citation like "S1", a label like "COVID19"), not a finding, so the
  // negative lookbehind/lookahead exclude those. Unicode-aware letter class so
  // accented labels are treated as identifiers too.
  const re = /(?<!\p{L})\d+(?:\.\d+)?%?(?!\p{L})/gu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    out.push(m[0]);
  }
  return out;
}

/**
 * Directional overlap: the fraction of the claim's (deduplicated) content
 * tokens that are found in the source sentence, 0..1. This is intentionally
 * asymmetric (NOT Jaccard): it measures coverage of the claim by the source,
 * so a short claim fully contained in a long source scores 1 regardless of how
 * much extra material the source carries. `a` is the claim, `b` is the source.
 */
export function tokenOverlap(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setB = new Set(b);
  let hits = 0;
  const seen = new Set<string>();
  for (const t of a) {
    if (seen.has(t)) continue;
    seen.add(t);
    if (setB.has(t)) hits += 1;
  }
  const denom = seen.size;
  return denom === 0 ? 0 : hits / denom;
}

// Common abbreviations whose trailing period must NOT end a sentence. Compared
// case-insensitively against the word immediately preceding the period. "et al"
// is handled by matching its last token "al".
const ABBREVIATIONS = new Set([
  "dr", "mr", "mrs", "ms", "prof", "fig", "no", "vs", "eq", "cf", "approx",
  "al", // "et al."
  "e.g", "i.e", // matched as compound tokens below
  "eg", "ie",
]);

/**
 * Split a body of text into sentences, keeping their character offsets.
 * A '.', '!' or '?' ends a sentence only when followed by whitespace or
 * end-of-string, the following visible char looks like a new sentence, and the
 * preceding word is not a known abbreviation.
 */
export function splitSentences(
  text: string,
): Array<{ text: string; start: number; end: number }> {
  const out: Array<{ text: string; start: number; end: number }> = [];
  // A '.', '!' or '?' ends a sentence only when it's followed by whitespace or
  // end-of-string. This protects decimals (e.g. "0.61", "p=0.002") whose '.'
  // is followed by a digit and must not split a scientific finding in two.
  let segStart = 0;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === "." || ch === "!" || ch === "?") {
      const next = text[i + 1];
      let isBoundary = next === undefined || /\s/.test(next);
      // Abbreviation guard (only for '.'): if the word ending at this period is
      // a known abbreviation (Dr., e.g., et al.), it is not a boundary.
      if (isBoundary && ch === ".") {
        const preceding = text.slice(segStart, i);
        // Last whitespace-separated token, lowercased, trailing dots trimmed
        // so "e.g" matches "e.g." and "al" matches "al".
        const lastToken = (preceding.match(/(\S+)$/)?.[1] ?? "")
          .toLowerCase()
          .replace(/\.+$/, "");
        if (ABBREVIATIONS.has(lastToken)) {
          isBoundary = false;
        }
      }
      if (isBoundary) {
        const raw = text.slice(segStart, i + 1);
        const leading = raw.length - raw.trimStart().length;
        const trimmed = raw.trim();
        if (trimmed.length > 0) {
          const start = segStart + leading;
          out.push({ text: trimmed, start, end: start + trimmed.length });
        }
        segStart = i + 1;
      }
    }
  }
  // Trailing text with no terminal punctuation.
  const tail = text.slice(segStart);
  const trimmedTail = tail.trim();
  if (trimmedTail.length > 0) {
    const leading = tail.length - tail.trimStart().length;
    const start = segStart + leading;
    out.push({ text: trimmedTail, start, end: start + trimmedTail.length });
  }
  return out;
}
