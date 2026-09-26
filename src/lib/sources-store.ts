import type { Source, Specialty } from "@/core/types";
import { SYNTHETIC_SOURCES } from "@/core/sources";

const SPECIALTIES: readonly Specialty[] = ["oncology", "dermatology"];

// Guard the DB string against the Specialty union: an unexpected row value
// falls back to a safe default rather than being blindly cast.
function toSpecialty(value: string): Specialty {
  return (SPECIALTIES as readonly string[]).includes(value)
    ? (value as Specialty)
    : "oncology";
}

// Reads sources from the database via Prisma when one is reachable and seeded
// (PostgreSQL/Neon in production, or a local SQLite file), and falls back to the
// in-memory synthetic constant otherwise. Either way the app runs with no setup.

export async function loadSources(): Promise<{
  sources: Source[];
  origin: "database" | "memory";
}> {
  try {
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();
    const rows = await prisma.source.findMany({ orderBy: { id: "asc" } });
    await prisma.$disconnect();
    if (rows.length > 0) {
      const sources: Source[] = rows.map((r) => ({
        id: r.id,
        title: r.title,
        authors: r.authors,
        year: r.year,
        specialty: toSpecialty(r.specialty),
        body: r.body,
      }));
      return { sources, origin: "database" };
    }
  } catch {
    // fall through to memory
  }
  return { sources: SYNTHETIC_SOURCES, origin: "memory" };
}
