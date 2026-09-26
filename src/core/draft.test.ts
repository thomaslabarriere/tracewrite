import { describe, it, expect } from "vitest";
import { draftFromSources } from "./draft";
import { verifyDraft } from "./verify";
import { extractClaims } from "./extract";
import { SYNTHETIC_SOURCES } from "./sources";

describe("draftFromSources", () => {
  it("cites every generated sentence to a source", () => {
    const r = draftFromSources(SYNTHETIC_SOURCES, 3);
    expect(r.sentences).toHaveLength(3);
    for (const s of r.sentences) {
      expect(s.text).toContain(`(${s.sourceId}).`);
    }
  });

  it("produces a draft whose claims mostly verify as supported against its own sources", () => {
    const r = draftFromSources(SYNTHETIC_SOURCES.slice(0, 3), 3);
    const report = verifyDraft(extractClaims(r.paragraph), SYNTHETIC_SOURCES);
    // Composed from real source spans, so it should ground well.
    expect(report.summary.supported).toBeGreaterThanOrEqual(2);
    expect(report.summary.unsupported).toBe(0);
  });

  it("skips a source with an empty body instead of emitting a bare citation", () => {
    const sources = [
      { id: "S98", title: "Empty", authors: "X", year: 2024, specialty: "oncology" as const, body: "   " },
      SYNTHETIC_SOURCES[0],
    ];
    const r = draftFromSources(sources, 2);
    expect(r.sentences).toHaveLength(1);
    expect(r.paragraph).not.toContain("(S98)");
    expect(r.paragraph.trim()).not.toBe("");
  });
});

describe("empty / whitespace-only draft", () => {
  it("yields no claims and an empty report through extract + verify", () => {
    for (const draft of ["", "   \n\t "]) {
      const claims = extractClaims(draft);
      expect(claims).toEqual([]);
      const report = verifyDraft(claims, SYNTHETIC_SOURCES);
      expect(report.summary.total).toBe(0);
      expect(report.verifications).toEqual([]);
    }
  });
});
