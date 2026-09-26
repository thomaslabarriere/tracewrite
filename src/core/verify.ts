import type {
  Claim,
  EvidenceSpan,
  Source,
  SourceCheck,
  SupportStatus,
  Verification,
  VerificationReport,
} from "./types";
import {
  contentTokens,
  numericTokens,
  splitSentences,
  tokenOverlap,
} from "./text";

/**
 * Deterministic groundedness verification.
 *
 * For a claim, we score every source. Within a source we find the best-matching
 * sentence (span) by content-token overlap, then apply a numeric guard: if the
 * claim states numbers (percentages, hazard ratios, durations), those numbers
 * must appear in the matched span, otherwise the score is penalized. Numbers
 * are where scientific claims most often drift from their source, so we make
 * them decisive rather than averaging them away.
 *
 * The verifier DETECTS insufficiently-supported claims. A "supported" status
 * means a source span lexically supports the claim — it is NOT a guarantee of
 * clinical correctness. Detection is not a guarantee.
 */

export interface VerifyThresholds {
  supported: number; // score >= supported  -> "supported"
  weak: number; // score >= weak (and < supported) -> "weak"; below -> "unsupported"
}

export const DEFAULT_THRESHOLDS: VerifyThresholds = {
  supported: 0.6,
  weak: 0.3,
};

interface SpanScore {
  span: EvidenceSpan;
  overlap: number;
  numericMatch: boolean;
  /** Combined score after the numeric guard. */
  score: number;
}

function scoreClaimAgainstSource(claim: Claim, source: Source): SpanScore | null {
  const claimContent = contentTokens(claim.text);
  const claimNums = numericTokens(claim.text);
  if (claimContent.length === 0) return null;

  const sentences = splitSentences(source.body);
  let best: SpanScore | null = null;

  for (const sent of sentences) {
    const overlap = tokenOverlap(claimContent, contentTokens(sent.text));
    if (overlap === 0) continue;

    const sentNums = new Set(numericTokens(sent.text));
    const numericMatch =
      claimNums.length === 0 || claimNums.every((n) => sentNums.has(n));

    // Numeric guard: if the claim asserts numbers not present in this span,
    // cap the contribution. If numbers all match, give a modest boost.
    let score = overlap;
    if (claimNums.length > 0) {
      if (numericMatch) score = Math.min(1, overlap + 0.2);
      else score = overlap * 0.5;
    }

    const span: EvidenceSpan = {
      sourceId: source.id,
      start: sent.start,
      end: sent.end,
      text: sent.text,
    };

    if (!best || score > best.score) {
      best = { span, overlap, numericMatch, score };
    }
  }

  return best;
}

function classify(score: number, t: VerifyThresholds): SupportStatus {
  if (score >= t.supported) return "supported";
  if (score >= t.weak) return "weak";
  return "unsupported";
}

export function verifyClaim(
  claim: Claim,
  sources: Source[],
  thresholds: VerifyThresholds = DEFAULT_THRESHOLDS,
): Verification {
  const checks: SourceCheck[] = [];
  let bestScore: SpanScore | null = null;
  let bestSourceId: string | undefined;

  // If the author cited a source, check it first (order only affects the trace
  // display, not the winning result — the max score always wins).
  const ordered = [...sources].sort((a, b) => {
    if (a.id === claim.citedSourceId) return -1;
    if (b.id === claim.citedSourceId) return 1;
    return 0;
  });

  for (const source of ordered) {
    const s = scoreClaimAgainstSource(claim, source);
    checks.push({
      sourceId: source.id,
      score: s ? Number(s.score.toFixed(3)) : 0,
      numericMatch: s ? s.numericMatch : false,
      span: s?.span,
    });
    if (s && (!bestScore || s.score > bestScore.score)) {
      bestScore = s;
      bestSourceId = source.id;
    }
  }

  const score = bestScore ? Number(bestScore.score.toFixed(3)) : 0;
  const status = classify(score, thresholds);

  const claimNums = numericTokens(claim.text);
  let reason: string;
  if (status === "unsupported") {
    reason = "No source span with sufficient lexical overlap was found.";
  } else if (bestScore && claimNums.length > 0 && !bestScore.numericMatch) {
    reason =
      "Partial overlap, but numeric values in the claim were not found in the source span.";
  } else if (status === "weak") {
    reason = "A related source span was found, but overlap is below the support threshold.";
  } else {
    reason = "A source span with strong lexical overlap supports this claim.";
  }

  // Note if the author's cited source is not the best-supporting source.
  if (claim.citedSourceId && bestSourceId && claim.citedSourceId !== bestSourceId) {
    reason += ` Cited ${claim.citedSourceId}, but ${bestSourceId} matched more strongly.`;
  }

  return {
    claim,
    status,
    score,
    evidence: bestScore && status !== "unsupported" ? bestScore.span : undefined,
    bestSourceId: status !== "unsupported" ? bestSourceId : undefined,
    checks: checks.sort((a, b) => b.score - a.score),
    reason,
  };
}

export function verifyDraft(
  claims: Claim[],
  sources: Source[],
  opts: { thresholds?: VerifyThresholds; engine?: "offline" | "llm" } = {},
): VerificationReport {
  const thresholds = opts.thresholds ?? DEFAULT_THRESHOLDS;
  const verifications = claims.map((c) => verifyClaim(c, sources, thresholds));

  const summary = {
    total: verifications.length,
    supported: verifications.filter((v) => v.status === "supported").length,
    weak: verifications.filter((v) => v.status === "weak").length,
    unsupported: verifications.filter((v) => v.status === "unsupported").length,
  };

  return {
    verifications,
    summary,
    checkedSourceIds: sources.map((s) => s.id),
    ranAt: new Date().toISOString(),
    engine: opts.engine ?? "offline",
  };
}
