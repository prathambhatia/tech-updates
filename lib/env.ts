import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  INGESTION_AUTO_ENABLED: z.string().default("true"),
  INGESTION_DAILY_CRON: z.string().default("0 6 * * *"),
  POPULARITY_REFRESH_ENABLED: z.string().default("true"),
  POPULARITY_REFRESH_INTERVAL_HOURS: z.string().default("6"),
  X_BEARER_TOKEN: z.string().optional(),
  GITHUB_TOKEN: z.string().optional()
});

const parsed = envSchema.safeParse({
  DATABASE_URL: process.env["DATABASE_URL"],
  INGESTION_AUTO_ENABLED: process.env["INGESTION_AUTO_ENABLED"],
  INGESTION_DAILY_CRON: process.env["INGESTION_DAILY_CRON"],
  POPULARITY_REFRESH_ENABLED: process.env["POPULARITY_REFRESH_ENABLED"],
  POPULARITY_REFRESH_INTERVAL_HOURS: process.env["POPULARITY_REFRESH_INTERVAL_HOURS"],
  X_BEARER_TOKEN: process.env["X_BEARER_TOKEN"],
  GITHUB_TOKEN: process.env["GITHUB_TOKEN"]
});

if (!parsed.success) {
  throw new Error(`Invalid environment variables: ${parsed.error.message}`);
}

const parsedData = parsed.data;

export const env = {
  DATABASE_URL: parsedData["DATABASE_URL"],
  INGESTION_AUTO_ENABLED: parsedData["INGESTION_AUTO_ENABLED"] === "true",
  INGESTION_DAILY_CRON: parsedData["INGESTION_DAILY_CRON"],
  POPULARITY_REFRESH_ENABLED: parsedData["POPULARITY_REFRESH_ENABLED"] === "true",
  POPULARITY_REFRESH_INTERVAL_HOURS: Number.parseInt(parsedData["POPULARITY_REFRESH_INTERVAL_HOURS"], 10),
  X_BEARER_TOKEN: parsedData["X_BEARER_TOKEN"]?.trim() || null,
  GITHUB_TOKEN: parsedData["GITHUB_TOKEN"]?.trim() || null
} as const;
