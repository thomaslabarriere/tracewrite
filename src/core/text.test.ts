import { describe, it, expect } from "vitest";
import {
  tokenize,
  contentTokens,
  numericTokens,
  tokenOverlap,
  splitSentences,
} from "./text";

describe("tokenize", () => {
  it("lowercases and strips punctuation, keeping hyphenated/decimal tokens", () => {
    expect(tokenize("PASI-75 response, p=0.002!")).toEqual([
      "pasi-75",
      "response",
      "p",
      "0.002",
    ]);
  });
});

describe("contentTokens", () => {
  it("drops stopwords and short tokens but keeps numbers", () => {
    const t = contentTokens("The response was 62% in the arm");
    expect(t).toContain("response");
    // Word-tokenization drops the '%' sign; the numeric guard tracks "62%"
    // separately via numericTokens().
    expect(t).toContain("62");
    expect(t).not.toContain("the");
    expect(t).not.toContain("was");
  });
});

describe("numericTokens", () => {
  it("extracts percentages and decimals", () => {
    expect(numericTokens("62% versus 48% (hazard ratio 0.61, p=0.002)")).toEqual([
      "62%",
      "48%",
      "0.61",
      "0.002",
    ]);
  });
  it("returns empty when no numbers present", () => {
    expect(numericTokens("well tolerated overall")).toEqual([]);
  });
});

describe("tokenize (Unicode)", () => {
  it("keeps accented characters instead of splitting them", () => {
    expect(tokenize("café Sørensen naïve")).toEqual([
      "café",
      "sørensen",
      "naïve",
    ]);
  });
});

describe("tokenOverlap", () => {
  it("is 1 for identical sets and 0 for disjoint", () => {
    expect(tokenOverlap(["a", "b"], ["a", "b"])).toBe(1);
    expect(tokenOverlap(["a"], ["z"])).toBe(0);
  });
  it("is fractional for partial overlap", () => {
    expect(tokenOverlap(["a", "b", "c", "d"], ["a", "b"])).toBe(0.5);
  });
  it("is directional: coverage of the claim by the source, not symmetric", () => {
    const claim = ["a", "b"];
    const source = ["a", "b", "c", "d"];
    // The claim is fully covered by the source -> 1.
    expect(tokenOverlap(claim, source)).toBe(1);
    // Swapping the arguments measures coverage of the source by the claim
    // instead, which is only partial -> 0.5. Proves the asymmetry.
    expect(tokenOverlap(source, claim)).toBe(0.5);
  });
});

describe("splitSentences", () => {
  it("splits on terminal punctuation and preserves offsets", () => {
    const text = "First claim here. Second claim follows.";
    const s = splitSentences(text);
    expect(s).toHaveLength(2);
    expect(s[0].text).toBe("First claim here.");
    expect(text.slice(s[1].start, s[1].end)).toBe("Second claim follows.");
  });

  it("does not over-split on abbreviations (Dr., et al., e.g.)", () => {
    const text =
      "Dr. Jones and colleagues reported the result. Smith et al. agreed, e.g. on dosing.";
    const s = splitSentences(text);
    expect(s).toHaveLength(2);
    expect(s[0].text).toBe("Dr. Jones and colleagues reported the result.");
    expect(s[1].text).toBe("Smith et al. agreed, e.g. on dosing.");
  });

  it("still protects decimals from splitting", () => {
    const s = splitSentences("The hazard ratio was 0.61 in the trial.");
    expect(s).toHaveLength(1);
  });
});
