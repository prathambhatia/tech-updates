import "dotenv/config";

import { PrismaClient } from "@prisma/client";

import { ingestAllSources } from "@/services/ingestion.service";

const prisma = new PrismaClient();

const INTERVIEW_SOURCE_NAMES = [
  "Medium: Interview Experience",
  "Medium: SDE Interview",
  "Medium: Coding Interview",
  "Medium: Tech Interview"
];

async function main() {
  const sources = await prisma.source.findMany({
    where: { name: { in: INTERVIEW_SOURCE_NAMES } },
    select: { name: true }
  });

  console.log(`[ingest-interview] Found ${sources.length} interview sources: ${sources.map((s) => s.name).join(", ")}`);

  if (sources.length === 0) {
    console.error("[ingest-interview] No interview sources found — run `npx prisma db seed` first");
    process.exit(1);
  }

  console.log("[ingest-interview] Starting ingestion of all sources (interview feeds will be picked up)...");
  const result = await ingestAllSources();

  console.log(
    `[ingest-interview] done — fetched=${result.fetchedCount} created=${result.createdCount} skipped=${result.skippedCount}`
  );
  console.log(`[ingest-interview] categoryAssignmentCounts=${JSON.stringify(result.categoryAssignmentCounts)}`);

  const perSource = result.results
    .filter((r) => INTERVIEW_SOURCE_NAMES.includes(r.sourceName))
    .map((r) => `${r.sourceName}: fetched=${r.fetchedCount} created=${r.createdCount} skipped=${r.skippedCount} errors=${r.errors.length}`);

  console.log("[ingest-interview] Interview source results:");
  for (const line of perSource) {
    console.log(`  ${line}`);
  }

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error("[ingest-interview] failed", error);
  await prisma.$disconnect();
  process.exit(1);
});
