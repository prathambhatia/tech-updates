export type IngestionStatus = "idle" | "running" | "success" | "error";

export type IngestionSummary = {
  startedAt: string;
  finishedAt: string;
  fetchedCount: number;
  createdCount: number;
  skippedCount: number;
  repairedDateCount: number;
};

export type IngestStartResponse = {
  ok?: boolean;
  accepted?: boolean;
  status?: IngestionStatus;
  message?: string | null;
  result?: Partial<IngestionSummary> | null;
};

export type IngestStatusResponse = {
  ok?: boolean;
  status?: IngestionStatus;
  message?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  result?: Partial<IngestionSummary> | null;
};
