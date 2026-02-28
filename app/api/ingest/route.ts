import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { getManualIngestionStatus, startManualIngestion } from "@/lib/ingestion-job";

function hasValidSecret(request: Request): boolean {
  if (!env.INGESTION_API_SECRET) {
    return false;
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return false;
  }

  const token = authHeader.slice("Bearer ".length).trim();
  return token.length > 0 && token === env.INGESTION_API_SECRET;
}

function rejectUnauthorized(): NextResponse {
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

function rejectManualDisabled(): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      message: "Manual ingestion is disabled."
    },
    {
      status: 403
    }
  );
}

export async function POST(request: Request) {
  if (!env.INGESTION_MANUAL_TRIGGER_ENABLED) {
    return rejectManualDisabled();
  }

  if (!hasValidSecret(request)) {
    return rejectUnauthorized();
  }

  try {
    const startResult = startManualIngestion();

    return NextResponse.json({
      ok: true,
      accepted: startResult.accepted,
      status: startResult.status,
      message: startResult.message,
      result: startResult.result
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
  if (!env.INGESTION_MANUAL_TRIGGER_ENABLED) {
    return rejectManualDisabled();
  }

  if (!hasValidSecret(request)) {
    return rejectUnauthorized();
  }

  try {
    const status = getManualIngestionStatus();

    return NextResponse.json({
      ok: true,
      status: status.status,
      message: status.message,
      startedAt: status.startedAt,
      finishedAt: status.finishedAt,
      result: status.result
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
