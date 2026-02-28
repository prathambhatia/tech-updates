import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { env } from "@/lib/env";
import type { DailySchedule } from "@/types/lib/scheduler.types";
import { ingestAllSources } from "@/services/ingestion.service";
import { refreshExternalPopularitySignals } from "@/services/popularity-signals.service";

declare global {
  // eslint-disable-next-line no-var
  var ingestionSchedulerStarted: boolean | undefined;
  // eslint-disable-next-line no-var
  var ingestionSchedulerRunning: boolean | undefined;
  // eslint-disable-next-line no-var
  var ingestionSchedulerTimer: NodeJS.Timeout | undefined;
  // eslint-disable-next-line no-var
  var popularitySchedulerRunning: boolean | undefined;
  // eslint-disable-next-line no-var
  var popularitySchedulerTimer: NodeJS.Timeout | undefined;
}

const CATCHUP_WINDOW_MS = 24 * 60 * 60 * 1000;
const LAST_RUN_FILE = path.join(process.cwd(), ".scheduler", "last-ingestion-success.json");

async function readLastSuccessfulRunTimestamp(): Promise<number | null> {
  try {
    const raw = await readFile(LAST_RUN_FILE, "utf8");
    const parsed = JSON.parse(raw) as { lastSuccessAt?: string };
    const timestamp = parsed.lastSuccessAt ? new Date(parsed.lastSuccessAt).getTime() : NaN;

    if (Number.isNaN(timestamp)) {
      return null;
    }

    return timestamp;
  } catch {
    return null;
  }
}

async function writeLastSuccessfulRunTimestamp(date: Date): Promise<void> {
  const directory = path.dirname(LAST_RUN_FILE);
  await mkdir(directory, { recursive: true });
  await writeFile(
    LAST_RUN_FILE,
    JSON.stringify(
      {
        lastSuccessAt: date.toISOString()
      },
      null,
      2
    ),
    "utf8"
  );
}

function parseDailyCron(input: string): DailySchedule | null {
  const parts = input.trim().split(/\s+/);

  // Supports daily cron format like "0 6 * * *"
  if (parts.length !== 5) {
    return null;
  }

  const minutePart = parts[0] ?? "";
  const hourPart = parts[1] ?? "";
  const dayPart = parts[2] ?? "";
  const monthPart = parts[3] ?? "";
  const weekdayPart = parts[4] ?? "";

  if (dayPart !== "*" || monthPart !== "*" || weekdayPart !== "*") {
    return null;
  }

  const hour = Number.parseInt(hourPart, 10);
  const minute = Number.parseInt(minutePart, 10);

  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  return { hour, minute };
}

function millisecondsUntilNextRun(schedule: DailySchedule): number {
  const now = new Date();

  const next = new Date(now);
  next.setHours(schedule.hour, schedule.minute, 0, 0);

  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }

  return next.getTime() - now.getTime();
}

async function runIngestionJob() {
  if (globalThis.ingestionSchedulerRunning) {
    return;
  }

  globalThis.ingestionSchedulerRunning = true;

  try {
    const result = await ingestAllSources();
    await writeLastSuccessfulRunTimestamp(new Date());

    console.info(
      `[scheduler] ingestion complete: created=${result.createdCount}, fetched=${result.fetchedCount}, skipped=${result.skippedCount}`
    );
    await runPopularityRefreshJob();
  } catch (error) {
    console.error("[scheduler] ingestion failed", error);
  } finally {
    globalThis.ingestionSchedulerRunning = false;
  }
}

function scheduleNextRun(schedule: DailySchedule) {
  const waitMs = millisecondsUntilNextRun(schedule);

  globalThis.ingestionSchedulerTimer = setTimeout(async () => {
    await runIngestionJob();
    scheduleNextRun(schedule);
  }, waitMs);
}

async function runPopularityRefreshJob() {
  if (!env.POPULARITY_REFRESH_ENABLED) {
    return;
  }

  if (globalThis.popularitySchedulerRunning) {
    return;
  }

  globalThis.popularitySchedulerRunning = true;

  try {
    const result = await refreshExternalPopularitySignals();
    console.info(
      `[scheduler] popularity refresh complete: checked=${result.checkedCount}, updated=${result.updatedCount}, errors=${result.errors.length}, topics=${result.trendingKeywords.slice(0, 5).join(", ")}`
    );
  } catch (error) {
    console.error("[scheduler] popularity refresh failed", error);
  } finally {
    globalThis.popularitySchedulerRunning = false;
  }
}

function schedulePopularityRefreshRun() {
  if (!env.POPULARITY_REFRESH_ENABLED) {
    return;
  }

  const intervalMs = Math.max(1, env.POPULARITY_REFRESH_INTERVAL_HOURS) * 60 * 60 * 1000;

  globalThis.popularitySchedulerTimer = setTimeout(async () => {
    await runPopularityRefreshJob();
    schedulePopularityRefreshRun();
  }, intervalMs);
}

async function runStartupCatchupIfNeeded() {
  const lastRunAt = await readLastSuccessfulRunTimestamp();

  if (!lastRunAt) {
    console.info("[scheduler] startup catch-up: no previous successful run found, running ingestion now");
    await runIngestionJob();
    return;
  }

  if (Date.now() - lastRunAt > CATCHUP_WINDOW_MS) {
    console.info("[scheduler] startup catch-up: last run older than 24h, running ingestion now");
    await runIngestionJob();
  }
}

export function ensureIngestionScheduler() {
  if (!env.INGESTION_AUTO_ENABLED) {
    return;
  }

  if (globalThis.ingestionSchedulerStarted) {
    return;
  }

  const parsedSchedule = parseDailyCron(env.INGESTION_DAILY_CRON);

  if (!parsedSchedule) {
    console.error(
      `[scheduler] invalid daily cron: ${env.INGESTION_DAILY_CRON}. Expected format like \"0 6 * * *\".`
    );
    return;
  }

  scheduleNextRun(parsedSchedule);
  schedulePopularityRefreshRun();
  void runStartupCatchupIfNeeded();
  void runPopularityRefreshJob();

  globalThis.ingestionSchedulerStarted = true;
  console.info(`[scheduler] daily ingestion scheduled: ${env.INGESTION_DAILY_CRON}`);
}
