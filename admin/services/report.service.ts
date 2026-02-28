import { prisma } from "@/lib/db";
import type {
  AdminDailyFetchBucket,
  AdminIngestionReport,
  AdminRecentFetchedArticle
} from "@/types/admin/report.types";

const DEFAULT_REPORT_DAYS = 14;
const DEFAULT_RECENT_FETCHED_LIMIT = 100;

function buildUtcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export async function getAdminIngestionReport(params?: {
  days?: number;
  recentLimit?: number;
}): Promise<AdminIngestionReport> {
  const now = new Date();
  const days = Math.max(1, Math.min(60, params?.days ?? DEFAULT_REPORT_DAYS));
  const recentLimit = Math.max(1, Math.min(250, params?.recentLimit ?? DEFAULT_RECENT_FETCHED_LIMIT));

  const todayUtcStart = startOfUtcDay(now);
  const periodStart = addUtcDays(todayUtcStart, -(days - 1));
  const periodEnd = addUtcDays(todayUtcStart, 1);

  const createdAtRows = await prisma.article.findMany({
    where: {
      createdAt: {
        gte: periodStart,
        lt: periodEnd
      }
    },
    select: {
      createdAt: true
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  const countsByDate = new Map<string, number>();
  for (const row of createdAtRows) {
    const key = buildUtcDateKey(row.createdAt);
    countsByDate.set(key, (countsByDate.get(key) ?? 0) + 1);
  }

  const dayBuckets: AdminDailyFetchBucket[] = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const bucketStart = addUtcDays(todayUtcStart, -offset);
    const bucketEnd = addUtcDays(bucketStart, 1);
    const key = buildUtcDateKey(bucketStart);

    dayBuckets.push({
      date: key,
      windowStart: bucketStart,
      windowEnd: bucketEnd,
      newBlogsCount: countsByDate.get(key) ?? 0
    });
  }

  const recentRows = await prisma.article.findMany({
    where: {
      createdAt: {
        gte: periodStart,
        lt: periodEnd
      }
    },
    select: {
      id: true,
      title: true,
      slug: true,
      createdAt: true,
      source: {
        select: {
          name: true,
          category: {
            select: {
              name: true
            }
          }
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    take: recentLimit
  });

  const recentFetchedArticles: AdminRecentFetchedArticle[] = recentRows.map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    createdAt: row.createdAt,
    sourceName: row.source.name,
    categoryName: row.source.category.name
  }));

  return {
    generatedAt: now,
    periodDays: days,
    totalNewBlogs: createdAtRows.length,
    dayBuckets,
    recentFetchedArticles
  };
}
