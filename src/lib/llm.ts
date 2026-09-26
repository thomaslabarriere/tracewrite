import type { Claim, Source, Verification } from "@/core/types";

// OPTIONAL live path. Only used when OPENAI_API_KEY is set. When unset (the
// default), callers use the deterministic offline verifier/drafter instead.
// This module is intentionally isolated so the offline build never depends on
// the `openai` package being installed.

export function liveEnabled(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

async function getClient() {
  const mod = await import("openai").catch(() => {
    throw new Error(
      "The `openai` package is not installed. Run `npm install openai` to use the live path.",
    );
  });
  const OpenAI = (mod as { default: new (o: { apiKey: string }) => unknown }).default;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY as string }) as {
    chat: {
      completions: {
        create: (args: unknown) => Promise<{
          choices: Array<{ message: { content: string | null } }>;
        }>;
      };
    };
  };
}

/**
 * Live drafting via the LLM. Returns a short evidence-summary paragraph. The
 * caller still runs the deterministic verifier over the result, so provenance
 * is checked regardless of how the draft was produced.
 */
export async function draftWithLLM(sources: Source[], limit = 3): Promise<string> {
  const client = await getClient();
  const picked = sources.slice(0, limit);
  const context = picked
    .map((s) => `[${s.id}] ${s.title}\n${s.body}`)
    .join("\n\n");
  const res = await client.chat.completions.create({
    model: MODEL,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content:
          "You write concise scientific evidence summaries. Use ONLY the provided sources. " +
          "After each sentence, cite the source id in parentheses, e.g. (S1). Do not invent facts.",
      },
      { role: "user", content: `Sources:\n${context}\n\nWrite a 3-4 sentence summary.` },
    ],
  });
  return res.choices[0]?.message?.content?.trim() ?? "";
}

/**
 * Live verification via the LLM, used as a drop-in replacement for the offline
 * verifier when the key is present. Kept minimal; the offline path remains the
 * reference implementation and the one the tests cover.
 */
export async function verifyClaimWithLLM(
  claim: Claim,
  sources: Source[],
): Promise<Pick<Verification, "status" | "score" | "reason" | "bestSourceId">> {
  const client = await getClient();
  const context = sources.map((s) => `[${s.id}] ${s.body}`).join("\n\n");
  const res = await client.chat.completions.create({
    model: MODEL,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You assess whether a claim is supported by the provided sources. " +
          'Reply as JSON: {"status":"supported|weak|unsupported","score":0..1,"bestSourceId":"S#|null","reason":"..."}. ' +
          "This detects insufficient support; it is not a guarantee of correctness.",
      },
      { role: "user", content: `Sources:\n${context}\n\nClaim: "${claim.text}"` },
    ],
  });
  const raw = res.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as {
    status?: string;
    score?: number;
    bestSourceId?: string | null;
    reason?: string;
  };
  const status =
    parsed.status === "supported" || parsed.status === "weak"
      ? parsed.status
      : "unsupported";
  return {
    status,
    score: typeof parsed.score === "number" ? parsed.score : 0,
    bestSourceId: parsed.bestSourceId ?? undefined,
    reason: parsed.reason ?? "LLM assessment.",
  };
}
