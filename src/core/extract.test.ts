import { describe, it, expect } from "vitest";
import { extractClaims } from "./extract";

describe("extractClaims", () => {
  it("splits a draft into sentence-level claims with offsets", () => {
    const draft =
      "Adjuvant therapy reduced recurrence risk. Overall survival improved markedly.";
    const claims = extractClaims(draft);
    expect(claims).toHaveLength(2);
    expect(draft.slice(claims[0].start, claims[0].end)).toBe(
      "Adjuvant therapy reduced recurrence risk.",
    );
  });

  it("skips fragments shorter than four words", () => {
    const claims = extractClaims("Too short. This one is a real claim sentence.");
    expect(claims).toHaveLength(1);
    expect(claims[0].text).toContain("real claim");
  });

  it("parses an inline citation into citedSourceId", () => {
    const claims = extractClaims("Recurrence-free survival was 62% at three years (S1).");
    expect(claims[0].citedSourceId).toBe("S1");
  });

  it("captures multiple citations in one sentence", () => {
    const claims = extractClaims(
      "Recurrence fell (S1) while survival rose across both cohorts (S2).",
    );
    expect(claims).toHaveLength(1);
    expect(claims[0].citedSourceId).toBe("S1");
    expect(claims[0].citedSourceIds).toEqual(["S1", "S2"]);
  });

  it("ignores mismatched brackets like [S3)", () => {
    const claims = extractClaims("The effect was durable across the cohort [S3).");
    expect(claims[0].citedSourceId).toBeUndefined();
    expect(claims[0].citedSourceIds).toBeUndefined();
  });

  it("handles empty and whitespace-only drafts", () => {
    expect(extractClaims("")).toEqual([]);
    expect(extractClaims("   \n\t  ")).toEqual([]);
  });

  it("produces stable ids for the same text/offset", () => {
    const a = extractClaims("The treatment was well tolerated overall.");
    const b = extractClaims("The treatment was well tolerated overall.");
    expect(a[0].id).toBe(b[0].id);
  });
});
