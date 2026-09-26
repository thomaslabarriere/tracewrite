// Framework-free domain types for the verification core.
// Nothing here imports React, Next, or Prisma — this module is pure and testable.

export type Specialty = "oncology" | "dermatology";

export interface Source {
  id: string;
  title: string;
  authors: string;
  year: number;
  specialty: Specialty;
  /** The abstract text. Verification matches spans inside this string. */
  body: string;
}

/** A single factual claim extracted from the draft. */
export interface Claim {
  /** Stable id derived from position + text. */
  id: string;
  /** The claim sentence, trimmed. */
  text: string;
  /** Character offset of the claim within the draft text. */
  start: number;
  end: number;
  /**
   * Optional citation the author (or the drafting step) attached, e.g. "S3".
   * When present, verification prefers this source but still checks support.
   */
  citedSourceId?: string;
  /**
   * All citations found in the sentence, in order of appearance and
   * de-duplicated. `citedSourceId` is the first of these.
   */
  citedSourceIds?: string[];
}

export type SupportStatus = "supported" | "weak" | "unsupported";

/** A located span of evidence inside a source body. */
export interface EvidenceSpan {
  sourceId: string;
  /** Character offsets within the source body. */
  start: number;
  end: number;
  text: string;
}

/** Per-source scoring detail — the observability "trace" for one claim. */
export interface SourceCheck {
  sourceId: string;
  /** Best matching sentence score for this source, 0..1. */
  score: number;
  /** Whether every numeric token in the claim was found in the matched span. */
  numericMatch: boolean;
  /** The best matching span in this source (if any overlap at all). */
  span?: EvidenceSpan;
}

export interface Verification {
  claim: Claim;
  status: SupportStatus;
  /** Overall support score 0..1 (score of the best source). */
  score: number;
  /** The winning source + evidence span, if any support was found. */
  evidence?: EvidenceSpan;
  bestSourceId?: string;
  /** Every source that was checked, with its score — the deterministic trace. */
  checks: SourceCheck[];
  /** Human-readable reason for the status. */
  reason: string;
}

export interface VerificationReport {
  verifications: Verification[];
  summary: {
    total: number;
    supported: number;
    weak: number;
    unsupported: number;
  };
  /** Which sources existed at verification time (the checked corpus). */
  checkedSourceIds: string[];
  /** ISO timestamp of the run. */
  ranAt: string;
  /** "offline" (deterministic) or "llm" (live path). */
  engine: "offline" | "llm";
}
