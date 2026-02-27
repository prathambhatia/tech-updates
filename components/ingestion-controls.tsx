"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useMemo, useRef, useState } from "react";

type IngestionStatus = "idle" | "running" | "success" | "error";

type IngestionSummary = {
  startedAt: string;
  finishedAt: string;
  fetchedCount: number;
  createdCount: number;
  skippedCount: number;
  repairedDateCount: number;
};

type IngestStartResponse = {
  ok?: boolean;
  accepted?: boolean;
  status?: IngestionStatus;
  message?: string | null;
  result?: Partial<IngestionSummary> | null;
};

type IngestStatusResponse = {
  ok?: boolean;
  status?: IngestionStatus;
  message?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  result?: Partial<IngestionSummary> | null;
};

function toErrorMessage(input: unknown): string {
  if (input instanceof Error) {
    return input.message;
  }

  return "Failed to fetch latest blogs. Please try again.";
}

function toSafeCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function IngestionControls() {
  const [status, setStatus] = useState<IngestionStatus>("idle");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [summary, setSummary] = useState<IngestionSummary | null>(null);
  const progressTimerRef = useRef<number | null>(null);
  const statusPollerRef = useRef<number | null>(null);

  const isRunning = status === "running";

  const clearProgressTimer = () => {
    if (progressTimerRef.current !== null) {
      window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  };

  const clearStatusPoller = () => {
    if (statusPollerRef.current !== null) {
      window.clearInterval(statusPollerRef.current);
      statusPollerRef.current = null;
    }
  };

  const startProgressTimer = () => {
    clearProgressTimer();
    progressTimerRef.current = window.setInterval(() => {
      setProgress((current) => {
        if (current >= 99) {
          return current;
        }

        if (current < 35) {
          return current + 7;
        }

        if (current < 70) {
          return current + 3;
        }

        if (current < 90) {
          return current + 1.2;
        }

        return current + 0.35;
      });
    }, 650);
  };

  useEffect(() => {
    return () => {
      clearProgressTimer();
      clearStatusPoller();
    };
  }, []);

  const toSummary = (
    source: Partial<IngestionSummary> | null | undefined,
    fallbackStartedAt: string,
    fallbackFinishedAt: string
  ): IngestionSummary => ({
    startedAt: source?.startedAt ?? fallbackStartedAt,
    finishedAt: source?.finishedAt ?? fallbackFinishedAt,
    fetchedCount: toSafeCount(source?.fetchedCount),
    createdCount: toSafeCount(source?.createdCount),
    skippedCount: toSafeCount(source?.skippedCount),
    repairedDateCount: toSafeCount(source?.repairedDateCount)
  });

  const syncIngestionStatus = async () => {
    try {
      const response = await fetch("/api/ingest", {
        method: "GET",
        cache: "no-store"
      });

      const payload = (await response.json().catch(() => null)) as IngestStatusResponse | null;
      if (!response.ok || payload?.ok !== true) {
        throw new Error(payload?.message ?? "Unable to read ingestion status.");
      }

      if (payload.status === "running") {
        setStatus("running");
        return;
      }

      if (payload.status === "error") {
        clearStatusPoller();
        clearProgressTimer();
        setStatus("error");
        setProgress(0);
        setErrorMessage(payload.message ?? "Ingestion failed.");
        setIsModalOpen(true);
        return;
      }

      if (payload.status === "success") {
        clearStatusPoller();
        clearProgressTimer();
        setSummary(
          toSummary(
            payload.result,
            payload.startedAt ?? new Date(Date.now() - 1_000).toISOString(),
            payload.finishedAt ?? new Date().toISOString()
          )
        );
        setStatus("success");
        setProgress(100);
        setErrorMessage(null);
        setIsModalOpen(true);
      }
    } catch (error) {
      clearStatusPoller();
      clearProgressTimer();
      setStatus("error");
      setProgress(0);
      setErrorMessage(toErrorMessage(error));
      setIsModalOpen(true);
    }
  };

  const startStatusPolling = () => {
    clearStatusPoller();
    statusPollerRef.current = window.setInterval(() => {
      void syncIngestionStatus();
    }, 2_000);
  };

  const runIngestion = async () => {
    if (isRunning) {
      setIsModalOpen(true);
      return;
    }

    setStatus("running");
    setIsModalOpen(true);
    setSummary(null);
    setErrorMessage(null);
    setProgress(8);
    startProgressTimer();

    try {
      const response = await fetch("/api/ingest", {
        method: "POST"
      });

      const payload = (await response.json().catch(() => null)) as IngestStartResponse | null;

      if (!response.ok || payload?.ok !== true) {
        throw new Error(payload?.message ?? "Ingestion request failed.");
      }

      if (payload.status === "success") {
        clearProgressTimer();
        setProgress(100);
        setSummary(
          toSummary(payload.result, new Date(Date.now() - 1_000).toISOString(), new Date().toISOString())
        );
        setStatus("success");
        setErrorMessage(null);
        setIsModalOpen(true);
        return;
      }

      if (payload.status === "error") {
        throw new Error(payload.message ?? "Ingestion failed.");
      }

      // Running: keep simulated progress and poll actual server state.
      setStatus("running");
      startStatusPolling();
    } catch (error) {
      clearStatusPoller();
      clearProgressTimer();
      setStatus("error");
      setProgress(0);
      setErrorMessage(toErrorMessage(error));
      setIsModalOpen(true);
    }
  };

  const displayProgress = isRunning ? Math.min(99, Math.round(progress)) : Math.min(100, Math.round(progress));
  const progressBarWidth = status === "error" ? 0 : Math.max(6, Math.min(100, progress));

  const resultHref = useMemo(() => {
    if (!summary) {
      return null;
    }

    return `/ingestion/fetched?startedAt=${encodeURIComponent(summary.startedAt)}&finishedAt=${encodeURIComponent(summary.finishedAt)}&page=1`;
  }, [summary]);

  const statusTitle =
    status === "running" ? "Fetching Latest Blogs" : status === "success" ? "Fetch Complete" : "Fetch Failed";

  const statusDescription =
    status === "running"
      ? "You can close this popup. Fetching will continue in the background."
      : status === "success"
        ? "Your latest fetch has finished."
        : "The fetch failed. You can retry.";

  return (
    <>
      <button
        type="button"
        onClick={runIngestion}
        className="rounded-full border border-accent-600 bg-accent-600 px-3 py-1 text-sm font-semibold text-white transition hover:bg-accent-500 dark:border-teal-400 dark:bg-teal-500 dark:text-slate-900 dark:hover:bg-teal-400"
      >
        {isRunning ? "Fetching..." : "Fetch Latest Blogs"}
      </button>

      {isRunning && !isModalOpen ? (
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="fixed bottom-4 right-4 z-50 rounded-full border border-accent-600 bg-white px-4 py-2 text-sm font-semibold text-accent-700 shadow-paper dark:border-teal-300 dark:bg-slate-900 dark:text-teal-200"
        >
          Fetching latest blogs... {displayProgress}%
        </button>
      ) : null}

      {isModalOpen ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-ink-950/45 px-4 dark:bg-slate-950/65"
          onClick={() => setIsModalOpen(false)}
          role="presentation"
        >
          <div
            className="w-full max-w-md rounded-2xl border border-ink-200 bg-white p-5 shadow-paper dark:border-slate-700 dark:bg-slate-900 dark:shadow-[0_22px_50px_rgba(2,8,23,0.62)]"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Latest blog fetch progress"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.17em] text-ink-500 dark:text-slate-400">
                  Ingestion
                </p>
                <h3 className="mt-1 font-display text-2xl font-semibold text-ink-900 dark:text-slate-100">{statusTitle}</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-full border border-ink-300 px-2 py-0.5 text-xs font-semibold text-ink-700 hover:border-accent-600 hover:text-accent-600 dark:border-slate-700 dark:text-slate-200 dark:hover:border-teal-300 dark:hover:text-teal-200"
              >
                Close
              </button>
            </div>

            <p className="mt-3 text-sm text-ink-600 dark:text-slate-300">{statusDescription}</p>

            <div className="mt-4">
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-ink-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-accent-600 transition-all duration-500 dark:bg-teal-400"
                  style={{ width: `${progressBarWidth}%` }}
                />
              </div>
              <p className="mt-2 text-xs font-medium text-ink-500 dark:text-slate-400">
                {status === "error"
                  ? errorMessage
                  : status === "success"
                    ? `${summary?.createdCount ?? 0} new articles fetched`
                    : `${displayProgress}% complete`}
              </p>
            </div>

            {status === "success" && summary ? (
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                  <div className="rounded-lg border border-ink-200 px-3 py-2 dark:border-slate-700">
                    <p className="text-ink-500 dark:text-slate-400">New articles</p>
                    <p className="font-semibold text-ink-900 dark:text-slate-100">{summary.createdCount}</p>
                  </div>
                  <div className="rounded-lg border border-ink-200 px-3 py-2 dark:border-slate-700">
                    <p className="text-ink-500 dark:text-slate-400">Total scanned</p>
                    <p className="font-semibold text-ink-900 dark:text-slate-100">{summary.fetchedCount}</p>
                  </div>
                  <div className="rounded-lg border border-ink-200 px-3 py-2 dark:border-slate-700">
                    <p className="text-ink-500 dark:text-slate-400">Skipped</p>
                    <p className="font-semibold text-ink-900 dark:text-slate-100">{summary.skippedCount}</p>
                  </div>
                  <div className="rounded-lg border border-ink-200 px-3 py-2 dark:border-slate-700">
                    <p className="text-ink-500 dark:text-slate-400">Dates repaired</p>
                    <p className="font-semibold text-ink-900 dark:text-slate-100">{summary.repairedDateCount}</p>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  {resultHref ? (
                    <Link
                      href={resultHref as Route}
                      className="rounded-lg border border-accent-600 bg-accent-600 px-3 py-2 text-center text-sm font-semibold text-white transition hover:bg-accent-500 dark:border-teal-400 dark:bg-teal-500 dark:text-slate-900 dark:hover:bg-teal-400"
                    >
                      View New Articles
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="rounded-lg border border-ink-300 px-3 py-2 text-sm font-semibold text-ink-700 transition hover:border-accent-600 hover:text-accent-600 dark:border-slate-700 dark:text-slate-200 dark:hover:border-teal-300 dark:hover:text-teal-200"
                  >
                    Refresh Home
                  </button>
                </div>
              </div>
            ) : null}

            {status === "error" ? (
              <button
                type="button"
                onClick={runIngestion}
                className="mt-4 w-full rounded-lg border border-accent-600 bg-accent-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-accent-500 dark:border-teal-400 dark:bg-teal-500 dark:text-slate-900 dark:hover:bg-teal-400"
              >
                Retry Fetch
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="mt-4 w-full rounded-lg border border-ink-300 px-3 py-2 text-sm font-semibold text-ink-700 transition hover:border-accent-600 hover:text-accent-600 dark:border-slate-700 dark:text-slate-200 dark:hover:border-teal-300 dark:hover:text-teal-200"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
