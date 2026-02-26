import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { parseFeed } from "@/lib/rss";
import { extractArticleText, scrapeFeedFallback } from "@/lib/scrape";
import type { IngestAllResult, IngestionArticleInput, SourceIngestionResult } from "@/types/ingestion";
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
  const extractedText = baseWordCount < 220 ? await extractArticleText(item.url) : null;
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
        parsedItems.push(
          await toIngestionInput({
            title: fallbackItem.title,
            url: fallbackItem.url,
            author: null,
            publishedAt: new Date(),
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

  for (const item of dedupedByUrl.values()) {
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

  const results: SourceIngestionResult[] = [];

  for (const source of sources) {
    const result = await ingestSingleSource(source);
    results.push(result);
  }

  const finishedAt = new Date();

  return {
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    sourceCount: sources.length,
    fetchedCount: results.reduce((total, result) => total + result.fetchedCount, 0),
    createdCount: results.reduce((total, result) => total + result.createdCount, 0),
    skippedCount: results.reduce((total, result) => total + result.skippedCount, 0),
    results
  };
}
