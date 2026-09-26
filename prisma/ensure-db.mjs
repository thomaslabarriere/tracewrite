// Ensures the local SQLite demo DB exists and is seeded, so `npm run dev`
// works with zero setup and no external database. Idempotent and best-effort:
// if anything fails (e.g. offline in a sandbox), the app falls back to the
// in-memory synthetic sources, so the demo still runs.
import { existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const dbPath = join(here, "dev.db");

if (existsSync(dbPath)) {
  process.exit(0);
}

try {
  console.log("[tracewrite] Creating local SQLite demo database...");
  execSync("npx prisma db push --skip-generate", {
    stdio: "inherit",
    cwd: join(here, ".."),
  });
  execSync("npx tsx prisma/seed.ts", {
    stdio: "inherit",
    cwd: join(here, ".."),
  });
} catch (err) {
  console.warn(
    "[tracewrite] Could not initialize dev.db; the app will fall back to " +
      "in-memory synthetic sources. Details:",
    err?.message ?? err,
  );
}
