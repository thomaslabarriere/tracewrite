import { NextRequest, NextResponse } from "next/server";
import { extractClaims, verifyDraft, verifyClaim } from "@/core";
import { loadSources } from "@/lib/sources-store";
import { liveEnabled, verifyClaimWithLLM } from "@/lib/llm";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { draft?: string; live?: boolean };
  const draft = typeof body.draft === "string" ? body.draft : "";
  const { sources } = await loadSources();
  const claims = extractClaims(draft);

  const useLive = Boolean(body.live) && liveEnabled();

  if (useLive) {
    // Live path: LLM verifies each claim; offline verifier still provides the
    // evidence span + full trace so the UI behaves identically.
    const offline = verifyDraft(claims, sources, { engine: "llm" });
    const verifications = await Promise.all(
      offline.verifications.map(async (v) => {
        try {
          const llm = await verifyClaimWithLLM(v.claim, sources);
          return { ...v, ...llm };
        } catch {
          return v; // fall back to offline result for this claim
        }
      }),
    );
    const summary = {
      total: verifications.length,
      supported: verifications.filter((v) => v.status === "supported").length,
      weak: verifications.filter((v) => v.status === "weak").length,
      unsupported: verifications.filter((v) => v.status === "unsupported").length,
    };
    return NextResponse.json({ ...offline, verifications, summary });
  }

  const report = verifyDraft(claims, sources, { engine: "offline" });
  return NextResponse.json(report);
}

// Single-claim verification (used by tests / debugging).
export async function GET(req: NextRequest) {
  const text = req.nextUrl.searchParams.get("claim") ?? "";
  const { sources } = await loadSources();
  const claims = extractClaims(text.endsWith(".") ? text : `${text}.`);
  const v = claims[0] ? verifyClaim(claims[0], sources) : null;
  return NextResponse.json({ verification: v });
}
