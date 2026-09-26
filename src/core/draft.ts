import type { Source } from "./types";
import { splitSentences } from "./text";

export interface DraftSentence {
  text: string;
  /** The source this sentence was composed from. */
  sourceId: string;
}

export interface DraftResult {
  /** Plain-text paragraph with inline citations, e.g. "... (S1)." */
  paragraph: string;
  sentences: DraftSentence[];
}

/**
 * Deterministic offline drafting.
 *
 * We compose a short evidence-summary paragraph by selecting the most
 * information-dense sentence (the one carrying numeric findings) from each of
 * the requested sources, lightly normalizing it, and appending an inline
 * citation. Every generated sentence therefore carries provenance to exactly
 * one source — that is the whole point.
 *
 * This is template composition, not generation: it cannot invent facts because
 * each sentence is lifted (and cited) from a real source span. The optional
 * live LLM path (see src/lib/llm.ts) can produce more fluent prose, but is
 * gated behind OPENAI_API_KEY and never required.
 */

function pickKeySentence(source: Source): string {
  const sentences = splitSentences(source.body);
  // Prefer a sentence containing a number (findings), else the longest.
  const withNum = sentences.filter((s) => /\d/.test(s.text));
  const pool = withNum.length > 0 ? withNum : sentences;
  let best = pool[0]?.text ?? source.body;
  let bestLen = best.length;
  for (const s of pool) {
    if (s.text.length > bestLen && s.text.length < 220) {
      best = s.text;
      bestLen = s.text.length;
    }
  }
  return best;
}

export function draftFromSources(sources: Source[], limit = 3): DraftResult {
  const chosen = sources.slice(0, limit);
  const sentences: DraftSentence[] = [];
  for (const src of chosen) {
    const key = pickKeySentence(src).replace(/\s+/g, " ").trim();
    const withoutTrailingDot = key.replace(/[.!?]+$/, "").trim();
    // Guard against an empty source body producing a bare " (S1)." with no
    // content: skip sources that yield nothing to cite.
    if (withoutTrailingDot.length === 0) continue;
    sentences.push({ text: `${withoutTrailingDot} (${src.id}).`, sourceId: src.id });
  }

  // No un-cited connective/intro sentence: every drafted sentence must carry
  // provenance to a source, which is the whole point of the tool.
  const paragraph = sentences.map((s) => s.text).join(" ");

  return { paragraph, sentences };
}
