import { NextResponse } from "next/server";

import { ingestAllSources } from "@/services/ingestion.service";
import { refreshExternalPopularitySignals } from "@/services/popularity-signals.service";

export async function POST() {
  try {
    const result = await ingestAllSources();
    const popularityRefresh = await refreshExternalPopularitySignals({
      daysBack: 45,
      limit: 320
    });

    return NextResponse.json({
      ok: true,
      ...result,
      popularityRefresh
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Ingestion failed"
      },
      {
        status: 500
      }
    );
  }
}
