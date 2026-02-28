import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

import { env } from "@/lib/env";
import { ingestAllSources } from "@/services/ingestion.service";

export const maxDuration = 300;

function hasValidCronSecret(request: Request): boolean {
  if (!env.CRON_SECRET) {
    return false;
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return false;
  }

  const token = authHeader.slice("Bearer ".length).trim();
  return token.length > 0 && token === env.CRON_SECRET;
}

async function runIngestion(request: Request): Promise<NextResponse> {
  if (!hasValidCronSecret(request)) {
    return NextResponse.json(
      {
        ok: false,
        message: "Unauthorized"
      },
      {
        status: 401
      }
    );
  }

  try {
    const result = await ingestAllSources();
    revalidateTag("articles");

    return NextResponse.json({
      ok: true,
      startedAt: result.startedAt,
      finishedAt: result.finishedAt,
      fetchedCount: result.fetchedCount,
      createdCount: result.createdCount,
      skippedCount: result.skippedCount,
      repairedDateCount: result.repairedDateCount
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

export async function GET(request: Request) {
  return runIngestion(request);
}

export async function POST(request: Request) {
  return runIngestion(request);
}
