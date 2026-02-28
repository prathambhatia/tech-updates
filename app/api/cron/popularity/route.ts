import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { refreshExternalPopularitySignals } from "@/services/popularity-signals.service";

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

async function runPopularityRefresh(request: Request): Promise<NextResponse> {
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
    const result = await refreshExternalPopularitySignals({
      daysBack: 45,
      limit: 320
    });

    return NextResponse.json({
      ok: true,
      checkedCount: result.checkedCount,
      updatedCount: result.updatedCount,
      errors: result.errors.length
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Popularity refresh failed"
      },
      {
        status: 500
      }
    );
  }
}

export async function GET(request: Request) {
  return runPopularityRefresh(request);
}

export async function POST(request: Request) {
  return runPopularityRefresh(request);
}
