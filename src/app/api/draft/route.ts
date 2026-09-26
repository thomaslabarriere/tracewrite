import { NextRequest, NextResponse } from "next/server";
import { draftFromSources } from "@/core";
import { loadSources } from "@/lib/sources-store";
import { liveEnabled, draftWithLLM } from "@/lib/llm";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    sourceIds?: string[];
    live?: boolean;
  };
  const { sources } = await loadSources();
  const selected =
    body.sourceIds && body.sourceIds.length > 0
      ? sources.filter((s) => body.sourceIds!.includes(s.id))
      : sources.slice(0, 3);

  if (body.live && liveEnabled()) {
    try {
      const paragraph = await draftWithLLM(selected, selected.length || 3);
      return NextResponse.json({ paragraph, engine: "llm" });
    } catch {
      // fall through to offline
    }
  }

  const result = draftFromSources(selected, selected.length || 3);
  return NextResponse.json({ ...result, engine: "offline" });
}
