import { describe, it, expect } from "vitest";
import { verifyClaim, verifyDraft, DEFAULT_THRESHOLDS } from "./verify";
import { extractClaims } from "./extract";
import { SYNTHETIC_SOURCES } from "./sources";
import type { Claim } from "./types";

function claim(text: string, citedSourceId?: string): Claim {
  return { id: "t", text, start: 0, end: text.length, citedSourceId };
}

describe("verifyClaim", () => {
  it("marks a near-verbatim numeric claim as supported and names the source", () => {
    const v = verifyClaim(
      claim(
        "3-year recurrence-free survival was 62% with zolgetinib versus 48% with placebo (hazard ratio 0.61).",
      ),
      SYNTHETIC_SOURCES,
    );
    expect(v.status).toBe("supported");
    expect(v.bestSourceId).toBe("S1");
    expect(v.evidence?.sourceId).toBe("S1");
  });

  it("marks an unrelated claim as unsupported with no evidence", () => {
    const v = verifyClaim(
      claim("The bridge was repainted blue during the summer festival."),
      SYNTHETIC_SOURCES,
    );
    expect(v.status).toBe("unsupported");
    expect(v.evidence).toBeUndefined();
    expect(v.bestSourceId).toBeUndefined();
  });

  it("penalizes a claim whose numbers do not appear in the source span", () => {
    // Same topic as S3 (rimexolone / PASI 75) but a fabricated 90% figure.
    const good = verifyClaim(
      claim("At week 16, 54% of patients achieved a PASI 75 response with rimexolone."),
      SYNTHETIC_SOURCES,
    );
    const bad = verifyClaim(
      claim("At week 16, 90% of patients achieved a PASI 75 response with rimexolone."),
      SYNTHETIC_SOURCES,
    );
    expect(good.score).toBeGreaterThan(bad.score);
    expect(good.status).toBe("supported");
    // The fabricated number should demote it below the supported threshold.
    expect(bad.status).not.toBe("supported");
  });

  it("always records a check for every source (the deterministic trace)", () => {
    const v = verifyClaim(claim("Median overall survival improved with the combination."), SYNTHETIC_SOURCES);
    expect(v.checks).toHaveLength(SYNTHETIC_SOURCES.length);
    // Checks are sorted best-first.
    for (let i = 1; i < v.checks.length; i += 1) {
      expect(v.checks[i - 1].score).toBeGreaterThanOrEqual(v.checks[i].score);
    }
  });

  it("flags when the author's cited source is not the strongest match", () => {
    const v = verifyClaim(
      claim(
        "3-year recurrence-free survival was 62% versus 48% with placebo (hazard ratio 0.61).",
        "S9",
      ),
      SYNTHETIC_SOURCES,
    );
    expect(v.bestSourceId).toBe("S1");
    expect(v.reason).toContain("Cited S9");
  });
});

describe("verifyDraft", () => {
  it("summary counts add up to the number of claims", () => {
    const draft =
      "3-year recurrence-free survival was 62% versus 48% with placebo. " +
      "The weather was pleasant on the day of the launch party.";
    const report = verifyDraft(extractClaims(draft), SYNTHETIC_SOURCES);
    const { total, supported, weak, unsupported } = report.summary;
    expect(supported + weak + unsupported).toBe(total);
    expect(report.checkedSourceIds).toHaveLength(SYNTHETIC_SOURCES.length);
    expect(report.engine).toBe("offline");
  });

  it("respects custom thresholds", () => {
    const c = extractClaims("A related source span was found for melanoma recurrence risk.");
    const strict = verifyDraft(c, SYNTHETIC_SOURCES, {
      thresholds: { supported: 0.99, weak: 0.98 },
    });
    expect(strict.summary.supported).toBe(0);
  });

  it("uses default thresholds when none provided", () => {
    expect(DEFAULT_THRESHOLDS.supported).toBeGreaterThan(DEFAULT_THRESHOLDS.weak);
  });
});
