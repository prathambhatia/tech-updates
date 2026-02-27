import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { parseFeed } from "@/lib/rss";
import { extractArticleText, scrapeFeedFallback } from "@/lib/scrape";
import type { IngestAllResult, IngestionArticleInput, SourceIngestionResult } from "@/types/ingestion";
import { inferExplicitDateFromText } from "@/utils/date";
import {
  countWords,
  estimateReadingTime,
  makeSlug,
  normalizeTag,
  plainText,
  preview,
  summarize,
  uniqueStrings
} from "@/utils/text";

const MEDIUM_ALLOWED_TAGS = new Set([
  "system design",
  "distributed systems",
  "llm",
  "transformers",
  "rag",
  "scaling"
]);

const REPAIR_CREATED_PUBLISHED_GAP_MS = 90 * 60 * 1000;
const REPAIR_MIN_DATE_SHIFT_MS = 2 * 24 * 60 * 60 * 1000;
const MAX_ITEMS_PROCESSED_PER_SOURCE = 12;
const SOURCE_INGESTION_CONCURRENCY = 4;
const SOURCE_INGESTION_TIMEOUT_MS = 20_000;

function canonicalUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    url.hash = "";

    for (const key of [...url.searchParams.keys()]) {
      if (key.startsWith("utm_") || key === "ref") {
        url.searchParams.delete(key);
      }
    }

    return url.toString();
  } catch {
    return rawUrl.trim();
  }
}

function normalizeMediumTag(tag: string): string {
  return normalizeTag(tag.replace(/[-_]+/g, " ").replace(/\s+/g, " "));
}

function isMediumSource(sourceUrl: string): boolean {
  return sourceUrl.includes("medium.com");
}

function isAllowedMediumArticle(input: {
  title: string;
  text: string;
  tags: string[];
}): boolean {
  const tagMatches = input.tags.some((tag) => MEDIUM_ALLOWED_TAGS.has(normalizeMediumTag(tag)));
  if (tagMatches) {
    return true;
  }

  const haystack = `${input.title} ${input.text}`.toLowerCase();
  return [...MEDIUM_ALLOWED_TAGS].some((allowedTag) => haystack.includes(allowedTag));
}

async function ensureUniqueSlug(title: string): Promise<string> {
  const base = makeSlug(title);
  let candidate = base;
  let suffix = 1;

  while (true) {
    const existing = await prisma.article.findUnique({
      where: { slug: candidate },
      select: { id: true }
    });

    if (!existing) {
      return candidate;
    }

    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
}

async function toIngestionInput(item: {
  title: string;
  url: string;
  author: string | null;
  publishedAt: Date;
  rawText: string;
  tags: string[];
}): Promise<IngestionArticleInput> {
  const normalizedText = plainText(item.rawText || item.title);
  const normalizedTitle = plainText(item.title);
  const baseWordCount = countWords(normalizedText);
  const extractedText = baseWordCount < 100 ? await extractArticleText(item.url) : null;
  const bestBodyText =
    extractedText && countWords(extractedText) > baseWordCount ? plainText(extractedText) : normalizedText;
  const readingCorpus = plainText(`${normalizedTitle} ${bestBodyText}`);
  const words = countWords(readingCorpus);
  const minMinutes = words >= 30 ? 2 : 1;

  return {
    title: normalizedTitle,
    url: canonicalUrl(item.url),
    author: item.author,
    publishedAt: item.publishedAt,
    summary: summarize(bestBodyText),
    contentPreview: preview(bestBodyText),
    readingTime: estimateReadingTime(readingCorpus, {
      wordsPerMinute: 170,
      minMinutes
    }),
    tags: uniqueStrings(item.tags.map((tag) => normalizeMediumTag(tag)))
  };
}

async function attachTags(tx: Prisma.TransactionClient, articleId: string, tags: string[]) {
  for (const tagName of tags) {
    const normalizedName = normalizeMediumTag(tagName);
    if (!normalizedName) {
      continue;
    }

    const tagSlug = makeSlug(normalizedName);
    const tag = await tx.tag.upsert({
      where: { slug: tagSlug },
      create: {
        name: normalizedName,
        slug: tagSlug
      },
      update: {
        name: normalizedName
      }
    });

    await tx.articleTag.upsert({
      where: {
        articleId_tagId: {
          articleId,
          tagId: tag.id
        }
      },
      create: {
        articleId,
        tagId: tag.id
      },
      update: {}
    });
  }
}

async function ingestSingleSource(source: {
  id: string;
  name: string;
  url: string;
  rssUrl: string;
}) {
  const errors: string[] = [];
  const parsedItems: IngestionArticleInput[] = [];

  try {
    const rssItems = await parseFeed(source.rssUrl);

    for (const item of rssItems) {
      parsedItems.push(
        await toIngestionInput({
          title: item.title,
          url: item.url,
          author: item.author,
          publishedAt: item.publishedAt,
          rawText: item.rawText,
          tags: item.tags
        })
      );
    }
  } catch (error) {
    errors.push(`RSS parsing failed: ${error instanceof Error ? error.message : "unknown error"}`);

    try {
      const fallbackItems = await scrapeFeedFallback(source.url);
      for (const fallbackItem of fallbackItems) {
        const inferredPublishedAt = inferExplicitDateFromText(`${fallbackItem.title} ${fallbackItem.rawText}`);
        parsedItems.push(
          await toIngestionInput({
            title: fallbackItem.title,
            url: fallbackItem.url,
            author: null,
            publishedAt: inferredPublishedAt ?? new Date(),
            rawText: fallbackItem.rawText,
            tags: []
          })
        );
      }
    } catch (fallbackError) {
      errors.push(
        `Fallback parsing failed: ${fallbackError instanceof Error ? fallbackError.message : "unknown error"}`
      );
    }
  }

  const dedupedByUrl = new Map<string, IngestionArticleInput>();
  for (const item of parsedItems) {
    if (!item.title || !item.url) {
      continue;
    }

    dedupedByUrl.set(item.url, item);
  }

  let createdCount = 0;
  let skippedCount = 0;
  const limitedItems = [...dedupedByUrl.values()].slice(0, MAX_ITEMS_PROCESSED_PER_SOURCE);

  for (const item of limitedItems) {
    if (isMediumSource(source.url) && !isAllowedMediumArticle({ title: item.title, text: item.summary, tags: item.tags })) {
      skippedCount += 1;
      continue;
    }

    const existing = await prisma.article.findUnique({
      where: {
        url: item.url
      },
      select: { id: true, readingTime: true }
    });

    if (existing) {
      if (existing.readingTime <= 1 && item.readingTime > existing.readingTime) {
        await prisma.article.update({
          where: { id: existing.id },
          data: {
            readingTime: item.readingTime
          }
        });
      }

      skippedCount += 1;
      continue;
    }

    try {
      const slug = await ensureUniqueSlug(item.title);

      await prisma.$transaction(async (tx) => {
        const created = await tx.article.create({
          data: {
            title: item.title,
            slug,
            url: item.url,
            author: item.author,
            summary: item.summary,
            contentPreview: item.contentPreview,
            publishedAt: item.publishedAt,
            readingTime: item.readingTime,
            sourceId: source.id
          }
        });

        await attachTags(tx, created.id, item.tags);
      });

      createdCount += 1;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        skippedCount += 1;
        continue;
      }

      errors.push(`Failed to persist article \"${item.title}\": ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }

  return {
    sourceId: source.id,
    sourceName: source.name,
    fetchedCount: dedupedByUrl.size,
    createdCount,
    skippedCount,
    errors
  } satisfies SourceIngestionResult;
}

function isLikelyFallbackStamped(record: {
  publishedAt: Date;
  createdAt: Date;
}): boolean {
  const publishedAtMs = record.publishedAt.getTime();
  const createdAtMs = record.createdAt.getTime();

  if (!Number.isFinite(publishedAtMs) || !Number.isFinite(createdAtMs)) {
    return false;
  }

  return Math.abs(publishedAtMs - createdAtMs) <= REPAIR_CREATED_PUBLISHED_GAP_MS;
}

async function repairIncorrectPublishedDates(): Promise<number> {
  const candidates = await prisma.article.findMany({
    select: {
      id: true,
      title: true,
      summary: true,
      contentPreview: true,
      publishedAt: true,
      createdAt: true
    }
  });

  let repairedDateCount = 0;

  for (const candidate of candidates) {
    if (!isLikelyFallbackStamped(candidate)) {
      continue;
    }

    const inferredPublishedAt = inferExplicitDateFromText(
      `${candidate.title} ${candidate.summary ?? ""} ${candidate.contentPreview ?? ""}`
    );

    if (!inferredPublishedAt) {
      continue;
    }

    const existingPublishedAtMs = candidate.publishedAt.getTime();
    const inferredPublishedAtMs = inferredPublishedAt.getTime();

    if (Math.abs(existingPublishedAtMs - inferredPublishedAtMs) < REPAIR_MIN_DATE_SHIFT_MS) {
      continue;
    }

    await prisma.article.update({
      where: {
        id: candidate.id
      },
      data: {
        publishedAt: inferredPublishedAt
      }
    });

    repairedDateCount += 1;
  }

  return repairedDateCount;
}

async function ingestSourcesWithConcurrency(
  sources: Array<{
    id: string;
    name: string;
    url: string;
    rssUrl: string;
  }>,
  concurrency: number
): Promise<SourceIngestionResult[]> {
  const results: SourceIngestionResult[] = [];
  let nextIndex = 0;

  async function ingestSourceWithTimeout(source: {
    id: string;
    name: string;
    url: string;
    rssUrl: string;
  }): Promise<SourceIngestionResult> {
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

    const timeoutPromise = new Promise<SourceIngestionResult>((resolve) => {
      timeoutHandle = setTimeout(() => {
        resolve({
          sourceId: source.id,
          sourceName: source.name,
          fetchedCount: 0,
          createdCount: 0,
          skippedCount: 0,
          errors: [`Source ingestion timed out after ${SOURCE_INGESTION_TIMEOUT_MS / 1000}s`]
        });
      }, SOURCE_INGESTION_TIMEOUT_MS);
    });

    const ingestionPromise = ingestSingleSource(source);
    const result = await Promise.race([ingestionPromise, timeoutPromise]);

    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }

    return result;
  }

  async function worker() {
    while (nextIndex < sources.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;

      const source = sources[currentIndex];
      if (!source) {
        continue;
      }

      const result = await ingestSourceWithTimeout(source);
      results[currentIndex] = result;
    }
  }

  const workerCount = Math.min(Math.max(concurrency, 1), sources.length || 1);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results.filter(Boolean);
}

export async function ingestAllSources(): Promise<IngestAllResult> {
  const startedAt = new Date();

  const sources = await prisma.source.findMany({
    orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      url: true,
      rssUrl: true
    }
  });

  const results = await ingestSourcesWithConcurrency(sources, SOURCE_INGESTION_CONCURRENCY);

  const repairedDateCount = await repairIncorrectPublishedDates();
  const finishedAt = new Date();

  return {
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    sourceCount: sources.length,
    fetchedCount: results.reduce((total, result) => total + result.fetchedCount, 0),
    createdCount: results.reduce((total, result) => total + result.createdCount, 0),
    skippedCount: results.reduce((total, result) => total + result.skippedCount, 0),
    repairedDateCount,
    results
  };
}
