import type { Claim } from "./types";
import { splitSentences } from "./text";

/**
 * Deterministic claim extraction.
 *
 * A "claim" is one sentence of the draft that asserts something factual. We
 * treat every sentence as a candidate claim, but skip sentences that carry no
 * factual signal (too short, or no content beyond boilerplate). Citations of
 * the form "[S3]" or "(S3)" attached to a sentence are parsed out. A sentence
 * may carry several ("(S1) ... (S2)"); all are collected in `citedSourceIds`,
 * and the first is also exposed as `citedSourceId` for the common single case.
 * Bracket pairing is strict, so a mismatched "[S3)" is ignored.
 *
 * Extraction is a deterministic schema, on purpose: turning prose into
 * claim rows is exactly where we want exactness, not an LLM guess.
 */

// Matched bracket pairs only: "[S3]" or "(S3)". A mismatched "[S3)" or "(S3]"
// will not match. Global + case-insensitive so all citations are collected.
const CITATION_RE = /\[\s*(S\d+)\s*\]|\(\s*(S\d+)\s*\)/gi;

function extractCitations(text: string): string[] {
  const ids: string[] = [];
  for (const m of text.matchAll(CITATION_RE)) {
    const id = (m[1] ?? m[2]).toUpperCase();
    if (!ids.includes(id)) ids.push(id);
  }
  return ids;
}

function stableId(text: string, start: number): string {
  let h = 5381;
  const s = `${start}:${text}`;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 33) ^ s.charCodeAt(i);
  }
  return `c${(h >>> 0).toString(36)}`;
}

export function extractClaims(draft: string): Claim[] {
  const sentences = splitSentences(draft);
  const claims: Claim[] = [];

  for (const s of sentences) {
    const words = s.text.split(/\s+/).filter(Boolean);
    // Skip fragments that are too short to be a real assertion.
    if (words.length < 4) continue;

    const citedSourceIds = extractCitations(s.text);
    const citedSourceId = citedSourceIds[0];

    claims.push({
      id: stableId(s.text, s.start),
      text: s.text,
      start: s.start,
      end: s.end,
      citedSourceId,
      citedSourceIds: citedSourceIds.length > 0 ? citedSourceIds : undefined,
    });
  }

  return claims;
}
