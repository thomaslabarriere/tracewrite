# TraceWrite

AI-assisted scientific-writing editor with **provenance for every claim**.

**Live demo:** https://tracewrite.vercel.app

> **Engineering thesis:** AI-assisted scientific writing is only useful if a
> professional can verify where each generated claim came from. In TraceWrite,
> every generated claim carries provenance to its source evidence; claims not
> sufficiently supported are surfaced for review, not silently trusted.

A professional drafts a short *evidence summary*, an assistant helps draft from
source documents, and (the centerpiece) a **claim-verification table** shows,
for every factual claim in the draft, whether a source span supports it.

> ⚠️ **Demo, synthetic data, not medical advice.** All source abstracts are
> invented (fictional drugs, effect sizes, p-values). The verifier **detects
> insufficiently-supported claims**; it does **not** guarantee correctness.
> Vocabulary here is *groundedness / unsupported claims*, not "hallucination".

---

## Problem

An LLM will happily produce fluent clinical prose that drifts from its sources:
a right topic with a wrong number, a conclusion the source never stated, a
citation to the wrong study. In a regulated medical-writing setting, fluent-but-
unverifiable text is a liability, not a productivity gain. The reviewer's real
job is checking *where each sentence came from*, and that is exactly the part
tools usually leave manual.

## Design

- **Provenance for every claim.** Each sentence the assistant drafts is composed
  from a single source span and carries an inline citation (e.g. `(S1)`).
  Clicking a claim's source in the table highlights the exact evidence span in
  the left-hand source panel.
- **Unsupported claims surfaced, not trusted.** Every claim is scored against
  every source. A numeric guard makes the figures decisive: if a claim states a
  value (percentage, hazard ratio, duration) that isn't present in the matched
  span, its score is penalized. Claims below the support threshold are pulled
  into a "surfaced for review" list and marked `⚠️ weak` or `✗ no support`.
- **Detection, not a guarantee.** A `✓ supported` status means a source span
  *lexically* supports the claim. It is a signal for the reviewer, not a
  correctness certificate. The UI and this README say so plainly.

## Architecture

```
src/core/            ← pure, framework-free verification core (unit-tested)
  text.ts            tokenization, numeric extraction, sentence splitting
  extract.ts         draft → claims (deterministic schema, citation parsing)
  verify.ts          claim × sources → status + evidence span + per-source trace
  draft.ts           offline template drafting (every sentence cited)
  sources.ts         10 synthetic abstracts (also used to seed the DB)

src/lib/
  sources-store.ts   loads sources from the database via Prisma, falls back to in-memory
  llm.ts             OPTIONAL live path (OpenAI), isolated & gated

src/app/api/*        Node route handlers: /sources, /draft, /verify
src/app/, components/ Next.js App Router UI (editor, sources panel, table)

prisma/              schema + seed (PostgreSQL/Neon in production)
e2e/                 Playwright smoke test
```

- **UI:** Next.js (App Router) + TypeScript + React 18. Rich editor via
  **TipTap**. The verification table uses **TanStack Table** with
  **TanStack Virtual** row virtualization.
- **API:** Node route handlers under `src/app/api`.
- **Data:** **Prisma** on **PostgreSQL (Neon)** in production (Biolevate's
  stack). The model layer uses only `String`/`Int`/`DateTime`, so it is
  provider-agnostic. On Vercel the build pushes the schema to Neon and seeds the
  synthetic sources; at runtime the app reads them from Postgres. If no database
  is reachable or seeded (for example a fresh local clone with no `DATABASE_URL`),
  the app transparently falls back to the in-memory synthetic sources, so it
  always runs with zero setup.
- **Verification core is deliberately separated from the UI** and imports no
  React/Next/Prisma. That is what makes it exhaustively unit-testable and what
  would let it run identically in a batch pipeline or a server job.

## Trade-offs

- **Deterministic where exactness matters.** Turning prose into claim rows
  (extraction schema) and deciding support status are done with pure, testable
  functions, not an LLM guess. The numeric guard is deliberately strict because
  numbers are where scientific claims most often drift.
- **AI where it adds value.** Drafting fluent prose is the part where an LLM
  genuinely helps, so the optional live path swaps in an LLM *for drafting* (and,
  if you want, verification), but the deterministic verifier still runs over the
  result, so provenance is checked regardless of how text was produced.
- **Offline-first by default.** No API key, no external DB. The deterministic
  extractor/verifier is the default and the reference implementation; the LLM
  path is gated behind `OPENAI_API_KEY` and never required.
- **Virtualization for performance.** The table renders only visible rows via
  TanStack Virtual, so it stays smooth at hundreds/thousands of claims while
  keeping sort + filter over the full set.
- **Lexical matching, not semantics.** The offline verifier is token-overlap +
  numeric matching, not embeddings. It is fast, deterministic, and explainable
  (you can see every per-source score), at the cost of missing paraphrases. The
  live path is the escape hatch when semantic matching is worth the dependency.

## Run it

```bash
npm install       # installs deps and generates the Prisma client
npm run dev       # http://localhost:3000  (no API key, no database needed)
```

A fresh local clone runs with no configuration: with no `DATABASE_URL`, the app
serves the synthetic sources from memory. To run it against a real database
locally, set `DATABASE_URL` to a Postgres string and run `npm run db:push` then
`npm run db:seed`. In production on Vercel this happens automatically at build
time against Neon (see `vercel-build`).

**Optional live path.** Copy `.env.example` to `.env` and set `OPENAI_API_KEY`
(and optionally `OPENAI_MODEL`). The API routes then accept `{ "live": true }`
to use the LLM for drafting/verification. With no key, everything stays offline
and deterministic.

## Tests

```bash
npm test          # Vitest unit tests for the pure core (offline, no network)
npm run test:e2e  # Playwright: loads the app, verifies, checks the table renders
```

- **Unit (30 tests):** `text` (Unicode-aware tokenization, numeric extraction,
  decimal-safe and abbreviation-aware sentence splitting, directional overlap),
  `extract` (claim schema, single and multiple citation parsing, mismatched
  brackets, empty drafts, stable ids), `verify` (supported/weak/unsupported
  classification, the numeric guard demoting a fabricated figure, full
  per-source trace, cited-vs-best-source flagging), `draft` (every sentence
  cited, empty-body sources skipped, drafts ground against their sources).
- **E2E:** starts the dev server, loads the app, clicks *Verify draft*, asserts
  the verification table renders rows and the groundedness summary appears.

All unit tests run with no network and no database (they exercise the pure
core directly).

## Observability

Verification is deterministic, so each run is fully explainable. The Status
column shows the per-claim score; each row's source button reveals the matched
evidence span; and the "Run trace" panel records the timestamp and exactly which
sources were checked. The `Verification` object also carries a `checks[]` array
with every source's score and numeric-match flag.

## Scope & limits

- **Synthetic data only.** The 10 abstracts are invented for demonstration and
  are clearly labelled in the UI. **Not medical advice.**
- **Detection ≠ guarantee.** `✓ supported` means a source span lexically
  supports the claim; it is a reviewer aid, not a correctness guarantee. The
  offline verifier can miss paraphrased support (lexical, not semantic) and, like
  any detector, can be wrong in both directions.
- **Groundedness vocabulary.** This project talks about *groundedness* and
  *unsupported claims*. It deliberately avoids "hallucination prevention" / "no
  hallucination": no tool can promise that, and claiming it would be dishonest.
- **Intentionally out of scope:** auth, multi-user, real hosted DB, real-time
  collaboration. This is a focused vertical slice.

## Tech

Next.js 14.2 · React 18 · TypeScript 5.6 · Prisma 5 (PostgreSQL/Neon) · TanStack
Table + Virtual · TipTap · Vitest · Playwright.

> Note: `npm audit` reports advisories against Next 14.2.x that are only fixed
> in Next 15/16 (e.g. Image Optimizer `remotePatterns`, which this app does not
> use). Staying on the 14.2.x line is a deliberate stability choice for the demo;
> most remaining advisories are dev-only (Vitest/esbuild, Playwright, PostCSS).
