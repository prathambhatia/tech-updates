import type { IngestAllResult } from "@/types/ingestion";

export type ManualIngestionStatus = "idle" | "running" | "success" | "error";

export type ManualIngestionJobState = {
  status: ManualIngestionStatus;
  startedAt: string | null;
  finishedAt: string | null;
  message: string | null;
  result: IngestAllResult | null;
};

export type StartManualIngestionResult = {
  accepted: boolean;
  status: ManualIngestionStatus;
  message: string | null;
  result: IngestAllResult | null;
};
