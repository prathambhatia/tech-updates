import "dotenv/config";

import { backfillPopularityV2 } from "@/services/popularity-signals.service";

async function main() {
  const daysArg = process.argv[2];
  const limitArg = process.argv[3];

  const daysBack = daysArg ? Number.parseInt(daysArg, 10) : 365;
  const limit = limitArg ? Number.parseInt(limitArg, 10) : 5000;

  const result = await backfillPopularityV2({
    daysBack: Number.isNaN(daysBack) ? 365 : daysBack,
    limit: Number.isNaN(limit) ? 5000 : limit
  });

  console.info(
    `[backfill-popularity-v2] checked=${result.checkedCount}, updated=${result.updatedCount}, daysBack=${daysBack}, limit=${limit}`
  );
}

main().catch((error) => {
  console.error("[backfill-popularity-v2] failed", error);
  process.exit(1);
});
