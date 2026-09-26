import { PrismaClient } from "@prisma/client";
import { SYNTHETIC_SOURCES } from "../src/core/sources";

const prisma = new PrismaClient();

async function main() {
  await prisma.source.deleteMany();
  for (const s of SYNTHETIC_SOURCES) {
    await prisma.source.create({
      data: {
        id: s.id,
        title: s.title,
        authors: s.authors,
        year: s.year,
        specialty: s.specialty,
        body: s.body,
      },
    });
  }
  const count = await prisma.source.count();
  console.log(`Seeded ${count} synthetic sources into dev.db (DEMO DATA).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
