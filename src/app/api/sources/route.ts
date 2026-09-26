import { NextResponse } from "next/server";
import { loadSources } from "@/lib/sources-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const { sources, origin } = await loadSources();
  return NextResponse.json({ sources, origin });
}
