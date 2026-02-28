import { ingestAllSources } from "@/services/ingestion.service";
import { refreshExternalPopularitySignals } from "@/services/popularity-signals.service";
import type {
  ManualIngestionJobState,
  ManualIngestionStatus,
  StartManualIngestionResult
} from "@/lib/ingestion-job.types";

declare global {
  // eslint-disable-next-line no-var
  var manualIngestionJobState: ManualIngestionJobState | undefined;
}

function emptyState(): ManualIngestionJobState {
  return {
    status: "idle",
    startedAt: null,
    finishedAt: null,
    message: null,
    result: null
  };
}

function getMutableState(): ManualIngestionJobState {
  if (!globalThis.manualIngestionJobState) {
    globalThis.manualIngestionJobState = emptyState();
  }

  return globalThis.manualIngestionJobState;
}

function toSnapshot(state: ManualIngestionJobState): ManualIngestionJobState {
  return {
    status: state.status,
    startedAt: state.startedAt,
    finishedAt: state.finishedAt,
    message: state.message,
    result: state.result
  };
}

export function getManualIngestionStatus(): ManualIngestionJobState {
  return toSnapshot(getMutableState());
}

export function startManualIngestion(): StartManualIngestionResult {
  const state = getMutableState();

  if (state.status === "running") {
    return {
      accepted: false,
      status: state.status,
      message: state.message,
      result: state.result
    };
  }

  // Scheduler job is already running in-process; avoid starting a second ingestion concurrently.
  if (globalThis.ingestionSchedulerRunning) {
    return {
      accepted: false,
      status: "error",
      message: "A scheduled ingestion is already running. Please wait for it to finish.",
      result: null
    };
  }

  state.status = "running";
  state.startedAt = new Date().toISOString();
  state.finishedAt = null;
  state.message = "Fetching latest blogs...";
  state.result = null;

  void (async () => {
    try {
      const result = await ingestAllSources();
      state.status = "success";
      state.startedAt = result.startedAt;
      state.finishedAt = result.finishedAt;
      state.message = null;
      state.result = result;

      void refreshExternalPopularitySignals({
        daysBack: 45,
        limit: 320
      }).catch((error) => {
        console.error("[ingest] popularity refresh failed after ingestion", error);
      });
    } catch (error) {
      state.status = "error";
      state.finishedAt = new Date().toISOString();
      state.message = error instanceof Error ? error.message : "Ingestion failed";
      state.result = null;
    }
  })();

  return {
    accepted: true,
    status: state.status,
    message: state.message,
    result: state.result
  };
}
