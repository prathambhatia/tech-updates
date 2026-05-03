import "dotenv/config";

import { PrismaClient } from "@prisma/client";

import { parseFeed } from "@/lib/rss";
import { resolveArticleCategorySlug } from "@/services/article/category-classifier";
import { countWords, estimateReadingTime, makeSlug, normalizeTag, plainText, preview, summarize, uniqueStrings } from "@/utils/text";

const prisma = new PrismaClient();

const INTERVIEW_SOURCES = [
  { name: "Medium: Interview Experience", url: "https://medium.com/tag/interview-experience", rssUrl: "https://medium.com/feed/tag/interview-experience" },
  { name: "Medium: SDE Interview",        url: "https://medium.com/tag/sde-interview",        rssUrl: "https://medium.com/feed/tag/sde-interview" },
  { name: "Medium: Coding Interview",     url: "https://medium.com/tag/coding-interview",     rssUrl: "https://medium.com/feed/tag/coding-interview" },
  { name: "Medium: Tech Interview",       url: "https://medium.com/tag/tech-interview",       rssUrl: "https://medium.com/feed/tag/tech-interview" }
];

function normTag(tag: string): string {
  return normalizeTag(tag.replace(/[-_]+/g, " ").replace(/\s+/g, " "));
}

async function ensureUniqueSlug(title: string): Promise<string> {
  const base = makeSlug(title);
  let candidate = base;
  let suffix = 1;
  while (true) {
    const existing = await prisma.article.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!existing) return candidate;
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
}

async function main() {
  const categories = await prisma.category.findMany({ select: { id: true, slug: true } });
  const categoryIdBySlug = new Map(categories.map((c) => [c.slug, c.id]));

  let totalCreated = 0;
  let totalSkipped = 0;

  for (const source of INTERVIEW_SOURCES) {
    console.log(`\n[ingest-interviews] Fetching ${source.name}...`);

    const dbSource = await prisma.source.findUnique({ where: { name: source.name }, select: { id: true, categoryId: true } });
    if (!dbSource) {
      console.log(`  Source not found in DB — run seed first`);
      continue;
    }

    let items: Awaited<ReturnType<typeof parseFeed>> = [];
    try {
      items = await parseFeed(source.rssUrl);
      console.log(`  Fetched ${items.length} items from RSS`);
    } catch (err) {
      console.error(`  RSS parse failed: ${err instanceof Error ? err.message : err}`);
      continue;
    }

    for (const item of items) {
      if (!item.title || !item.url) continue;

      const existing = await prisma.article.findUnique({ where: { url: item.url }, select: { id: true } });
      if (existing) { totalSkipped++; continue; }

      const normalizedText = plainText(item.rawText || item.title);
      const words = countWords(normalizedText);
      const tags = uniqueStrings(item.tags.map(normTag));

      const categorySlug = resolveArticleCategorySlug({
        sourceName: source.name,
        sourceUrl: source.url,
        sourceRssUrl: source.rssUrl,
        title: plainText(item.title),
        summary: summarize(normalizedText),
        contentPreview: preview(normalizedText),
        tags
      });

      const categoryId = categoryIdBySlug.get(categorySlug) ?? dbSource.categoryId;
      const slug = await ensureUniqueSlug(item.title);

      try {
        await prisma.article.create({
          data: {
            title: plainText(item.title),
            slug,
            url: item.url,
            author: item.author,
            summary: summarize(normalizedText),
            contentPreview: preview(normalizedText),
            publishedAt: item.publishedAt,
            readingTime: estimateReadingTime(normalizedText, { wordsPerMinute: 170, minMinutes: words >= 30 ? 2 : 1 }),
            sourceId: dbSource.id,
            categoryId
          }
        });
        console.log(`  ✓ [${categorySlug}] ${item.title.slice(0, 70)}`);
        totalCreated++;
      } catch {
        totalSkipped++;
      }
    }
  }

  console.log(`\n[ingest-interviews] Done — created=${totalCreated} skipped=${totalSkipped}`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
