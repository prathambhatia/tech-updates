import "dotenv/config";

import { PrismaClient } from "@prisma/client";

import { resolveArticleCategorySlug } from "@/services/article/category-classifier";

const prisma = new PrismaClient();

const CATEGORY_DEFINITIONS = [
  { name: "ML, AI & Agents", slug: "ml-ai-agents" },
  { name: "Big Tech Architecture", slug: "big-tech-architecture" },
  { name: "Big Tech Outages", slug: "big-tech-outages" },
  { name: "Popular Medium Engineering", slug: "popular-medium-engineering" }
] as const;

const SOURCE_CATEGORY_BY_NAME: Record<string, string> = {
  OpenAI: "ml-ai-agents",
  Anthropic: "ml-ai-agents",
  Cognition: "ml-ai-agents",
  HuggingFace: "ml-ai-agents",
  "Google DeepMind Blog": "ml-ai-agents",
  Cloudflare: "big-tech-architecture",
  LangChain: "ml-ai-agents",
  "Vercel AI": "ml-ai-agents",
  "Netflix Tech Blog": "big-tech-architecture",
  "Uber Engineering": "big-tech-architecture",
  "Stripe Engineering": "big-tech-architecture",
  "Dropbox Tech": "big-tech-architecture",
  "Meta Engineering": "big-tech-architecture",
  "Google Cloud Blog": "big-tech-architecture",
  "AWS Architecture": "big-tech-architecture",
  "Medium: System Design": "popular-medium-engineering",
  "Medium: Distributed Systems": "popular-medium-engineering",
  "Medium: LLM": "popular-medium-engineering",
  "Medium: Transformers": "popular-medium-engineering",
  "Medium: RAG": "popular-medium-engineering",
  "Medium: Scaling": "popular-medium-engineering"
};

async function ensureCategories() {
  for (const category of CATEGORY_DEFINITIONS) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      create: category,
      update: { name: category.name }
    });
  }

  const categories = await prisma.category.findMany({
    select: { id: true, slug: true }
  });

  return new Map(categories.map((category) => [category.slug, category.id]));
}

async function backfillSourceCategories(categoryIdBySlug: Map<string, string>) {
  let updatedCount = 0;

  for (const [sourceName, categorySlug] of Object.entries(SOURCE_CATEGORY_BY_NAME)) {
    const categoryId = categoryIdBySlug.get(categorySlug);
    if (!categoryId) {
      throw new Error(`Missing category for slug ${categorySlug}`);
    }

    const result = await prisma.source.updateMany({
      where: { name: sourceName },
      data: { categoryId }
    });

    updatedCount += result.count;
  }

  return updatedCount;
}

async function backfillArticleCategories(categoryIdBySlug: Map<string, string>) {
  type BackfillRow = {
    id: string;
    title: string;
    summary: string | null;
    contentPreview: string | null;
    categoryId: string | null;
    source: {
      name: string;
      url: string;
      rssUrl: string;
    };
    tags: Array<{
      tag: {
        name: string;
      };
    }>;
  };

  const batchSize = 250;
  let cursorId: string | null = null;
  let checkedCount = 0;
  let updatedCount = 0;
  const categoryAssignmentCounts: Record<string, number> = {};
  const totalArticles = await prisma.article.count();
  let batchNumber = 0;

  console.log(`[backfill-article-categories] totalArticles=${totalArticles} batchSize=${batchSize}`);

  while (true) {
    const rows: BackfillRow[] = await prisma.article.findMany({
      ...(cursorId
        ? {
            cursor: { id: cursorId },
            skip: 1
          }
        : {}),
      take: batchSize,
      orderBy: { id: "asc" },
      select: {
        id: true,
        title: true,
        summary: true,
        contentPreview: true,
        categoryId: true,
        source: {
          select: {
            name: true,
            url: true,
            rssUrl: true
          }
        },
        tags: {
          select: {
            tag: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    if (!rows.length) {
      break;
    }
    batchNumber += 1;

    for (const row of rows) {
      checkedCount += 1;
      const nextCategorySlug = resolveArticleCategorySlug({
        sourceName: row.source.name,
        sourceUrl: row.source.url,
        sourceRssUrl: row.source.rssUrl,
        title: row.title,
        summary: row.summary,
        contentPreview: row.contentPreview,
        tags: row.tags.map((binding) => binding.tag.name)
      });

      const nextCategoryId = categoryIdBySlug.get(nextCategorySlug);
      if (!nextCategoryId) {
        throw new Error(`Missing category for resolved slug ${nextCategorySlug}`);
      }
      categoryAssignmentCounts[nextCategorySlug] = (categoryAssignmentCounts[nextCategorySlug] ?? 0) + 1;

      if (row.categoryId !== nextCategoryId) {
        await prisma.article.update({
          where: { id: row.id },
          data: { categoryId: nextCategoryId }
        });
        updatedCount += 1;
      }
    }

    cursorId = rows[rows.length - 1]?.id ?? null;
    const percentComplete = totalArticles > 0 ? ((checkedCount / totalArticles) * 100).toFixed(2) : "100.00";
    console.log(
      `[backfill-article-categories] batch=${batchNumber} checked=${checkedCount}/${totalArticles} (${percentComplete}%) updated=${updatedCount}`
    );
  }

  return { checkedCount, updatedCount, categoryAssignmentCounts };
}

async function deleteLegacyCategories() {
  const legacySlugs = ["frontier-ai-agents", "ai-tooling-infra"];
  let deletedCount = 0;

  for (const slug of legacySlugs) {
    const legacy = await prisma.category.findUnique({
      where: { slug },
      select: { id: true }
    });

    if (!legacy) {
      continue;
    }

    const inUse = await Promise.all([
      prisma.source.count({ where: { categoryId: legacy.id } }),
      prisma.article.count({ where: { categoryId: legacy.id } })
    ]);

    if (inUse[0] === 0 && inUse[1] === 0) {
      await prisma.category.delete({ where: { id: legacy.id } });
      deletedCount += 1;
    }
  }

  return deletedCount;
}

async function main() {
  const categoryIdBySlug = await ensureCategories();
  const updatedSourceCount = await backfillSourceCategories(categoryIdBySlug);
  const articleResult = await backfillArticleCategories(categoryIdBySlug);
  const deletedLegacyCount = await deleteLegacyCategories();

  console.log(
    `[backfill-article-categories] sourceUpdates=${updatedSourceCount} checkedArticles=${articleResult.checkedCount} updatedArticles=${articleResult.updatedCount} deletedLegacyCategories=${deletedLegacyCount} categoryAssignmentCounts=${JSON.stringify(articleResult.categoryAssignmentCounts)}`
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("[backfill-article-categories] failed", error);
    await prisma.$disconnect();
    process.exit(1);
  });
