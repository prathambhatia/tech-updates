import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  PRISMA_DATABASE_URL: z.string().optional(),
  INGESTION_AUTO_ENABLED: z.string().default("false"),
  INGESTION_MANUAL_TRIGGER_ENABLED: z.string().default("false"),
  INGESTION_API_SECRET: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  INGESTION_DAILY_CRON: z.string().default("0 6 * * *"),
  POPULARITY_REFRESH_ENABLED: z.string().default("false"),
  POPULARITY_REFRESH_INTERVAL_HOURS: z.string().default("6"),
  POPULARITY_V2_ENABLED: z.string().default("true"),
  POPULARITY_HALF_LIFE_HOURS: z.string().default("168"),
  ADMIN_ID: z.string().optional(),
  ADMIN_PASSWORD: z.string().optional(),
  ADMIN_SESSION_SECRET: z.string().optional(),
  X_BEARER_TOKEN: z.string().optional(),
  GITHUB_TOKEN: z.string().optional()
});

const parsed = envSchema.safeParse({
  DATABASE_URL: process.env["DATABASE_URL"],
  PRISMA_DATABASE_URL: process.env["PRISMA_DATABASE_URL"],
  INGESTION_AUTO_ENABLED: process.env["INGESTION_AUTO_ENABLED"],
  INGESTION_MANUAL_TRIGGER_ENABLED: process.env["INGESTION_MANUAL_TRIGGER_ENABLED"],
  INGESTION_API_SECRET: process.env["INGESTION_API_SECRET"],
  CRON_SECRET: process.env["CRON_SECRET"],
  INGESTION_DAILY_CRON: process.env["INGESTION_DAILY_CRON"],
  POPULARITY_REFRESH_ENABLED: process.env["POPULARITY_REFRESH_ENABLED"],
  POPULARITY_REFRESH_INTERVAL_HOURS: process.env["POPULARITY_REFRESH_INTERVAL_HOURS"],
  POPULARITY_V2_ENABLED: process.env["POPULARITY_V2_ENABLED"],
  POPULARITY_HALF_LIFE_HOURS: process.env["POPULARITY_HALF_LIFE_HOURS"],
  ADMIN_ID: process.env["ADMIN_ID"],
  ADMIN_PASSWORD: process.env["ADMIN_PASSWORD"],
  ADMIN_SESSION_SECRET: process.env["ADMIN_SESSION_SECRET"],
  X_BEARER_TOKEN: process.env["X_BEARER_TOKEN"],
  GITHUB_TOKEN: process.env["GITHUB_TOKEN"]
});

if (!parsed.success) {
  throw new Error(`Invalid environment variables: ${parsed.error.message}`);
}

const parsedData = parsed.data;

export const env = {
  DATABASE_URL: parsedData["DATABASE_URL"],
  PRISMA_DATABASE_URL: parsedData["PRISMA_DATABASE_URL"]?.trim() || null,
  INGESTION_AUTO_ENABLED: parsedData["INGESTION_AUTO_ENABLED"] === "true",
  INGESTION_MANUAL_TRIGGER_ENABLED: parsedData["INGESTION_MANUAL_TRIGGER_ENABLED"] === "true",
  INGESTION_API_SECRET: parsedData["INGESTION_API_SECRET"]?.trim() || null,
  CRON_SECRET: parsedData["CRON_SECRET"]?.trim() || null,
  INGESTION_DAILY_CRON: parsedData["INGESTION_DAILY_CRON"],
  POPULARITY_REFRESH_ENABLED: parsedData["POPULARITY_REFRESH_ENABLED"] === "true",
  POPULARITY_REFRESH_INTERVAL_HOURS: Number.parseInt(parsedData["POPULARITY_REFRESH_INTERVAL_HOURS"], 10),
  POPULARITY_V2_ENABLED: parsedData["POPULARITY_V2_ENABLED"] === "true",
  POPULARITY_HALF_LIFE_HOURS: Number.parseInt(parsedData["POPULARITY_HALF_LIFE_HOURS"], 10),
  ADMIN_ID: parsedData["ADMIN_ID"]?.trim() || null,
  ADMIN_PASSWORD: parsedData["ADMIN_PASSWORD"] || null,
  ADMIN_SESSION_SECRET: parsedData["ADMIN_SESSION_SECRET"]?.trim() || null,
  X_BEARER_TOKEN: parsedData["X_BEARER_TOKEN"]?.trim() || null,
  GITHUB_TOKEN: parsedData["GITHUB_TOKEN"]?.trim() || null
} as const;
