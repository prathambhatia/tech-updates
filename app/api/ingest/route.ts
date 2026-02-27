import { NextResponse } from "next/server";

import { getManualIngestionStatus, startManualIngestion } from "@/lib/ingestion-job";

export async function POST() {
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

export async function GET() {
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
