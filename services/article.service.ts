import type { Prisma } from "@prisma/client";

import { env } from "@/lib/env";
import {
  readArticleDelegate,
  readCategoryDelegate,
  withReadCache
} from "@/services/article/cache";
import {
  asFiniteNumber,
  computeJuniorRelevanceScore,
  computeLearningTracks,
  computePopularityScore,
  effectiveReadingTime,
  importanceLevel,
  isLowSignalArticle,
  resolvedBreakthroughScore,
  resolvedHotTopicScore
} from "@/services/article/scoring";
import type { ArticleRecord, CategoryWithSourcesRecord } from "@/services/article/types";
import type { ArticleCard, ArticleDetail, CategoryCard, SortDirection } from "@/types/article";

const CATEGORY_PAGE_SIZE = 12;
const SEARCH_PAGE_SIZE = 12;
const INGESTION_PAGE_SIZE = 12;
const CANDIDATE_MULTIPLIER = 4;

function sortRecords(records: ArticleRecord[], sort: SortDirection): ArticleRecord[] {
  const filtered = records.filter((record) => !isLowSignalArticle(record));

  if (sort === "latest") {
    return filtered.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
  }

  if (sort === "oldest") {
    return filtered.sort((a, b) => a.publishedAt.getTime() - b.publishedAt.getTime());
  }

  if (env.POPULARITY_V2_ENABLED) {
    return filtered.sort((a, b) => {
      const v2Diff = asFiniteNumber(b.popularityScoreV2, 0) - asFiniteNumber(a.popularityScoreV2, 0);
      if (v2Diff !== 0) {
        return v2Diff;
      }

      return b.publishedAt.getTime() - a.publishedAt.getTime();
    });
  }

  return filtered.sort((a, b) => {
    const compositeA = computeJuniorRelevanceScore(a) * 0.62 + computePopularityScore(a) * 0.38;
    const compositeB = computeJuniorRelevanceScore(b) * 0.62 + computePopularityScore(b) * 0.38;

    const compositeDiff = compositeB - compositeA;
    if (compositeDiff !== 0) {
      return compositeDiff;
    }

    const viralDiff = b.viralVelocityScore - a.viralVelocityScore;
    if (viralDiff !== 0) {
      return viralDiff;
    }

    return b.publishedAt.getTime() - a.publishedAt.getTime();
  });
}

function dbOrderBy(sort: SortDirection): Prisma.ArticleOrderByWithRelationInput[] {
  if (sort === "latest") {
    return [{ publishedAt: "desc" }];
  }

  if (sort === "oldest") {
    return [{ publishedAt: "asc" }];
  }

  if (env.POPULARITY_V2_ENABLED) {
    return [{ popularityScoreV2: "desc" }, { publishedAt: "desc" }];
  }

  return [
    { externalPopularityScore: "desc" },
    { viralVelocityScore: "desc" },
    { hotTopicScore: "desc" },
    { breakthroughScore: "desc" },
    { publishedAt: "desc" }
  ];
}

function mapArticle(record: ArticleRecord): ArticleCard {
  const tracks = computeLearningTracks(record).tracks;
  const juniorScore = asFiniteNumber(computeJuniorRelevanceScore(record), 0);
  const breakthroughScore = resolvedBreakthroughScore(record);
  const hotTopicScore = resolvedHotTopicScore(record);
  const readingTime = effectiveReadingTime(record);
  const popularityScore = env.POPULARITY_V2_ENABLED
    ? asFiniteNumber(record.popularityScoreV2, 0)
    : asFiniteNumber(computePopularityScore(record), 0);

  return {
    id: record.id,
    title: record.title,
    slug: record.slug,
    summary: record.summary,
    contentPreview: record.contentPreview,
    author: record.author,
    publishedAt: record.publishedAt,
    readingTime,
    sourceName: record.source.name,
    categoryName: record.source.category.name,
    categorySlug: record.source.category.slug,
    tags: record.tags.map((binding) => binding.tag.name),
    popularityScore,
    popularityScoreV2: asFiniteNumber(record.popularityScoreV2, 0),
    popularityConfidence: asFiniteNumber(record.popularityConfidence, 0),
    juniorRelevanceScore: juniorScore,
    externalPopularityScore: asFiniteNumber(record.externalPopularityScore, 0),
    viralVelocityScore: asFiniteNumber(record.viralVelocityScore, 0),
    breakthroughScore,
    hotTopicScore,
    learningTracks: tracks,
    importanceLevel: importanceLevel(juniorScore)
  };
}

export async function getCategoryCards(): Promise<CategoryCard[]> {
  const categories: CategoryWithSourcesRecord[] = await readCategoryDelegate.findMany({
    orderBy: { name: "asc" },
    ...withReadCache(["categories"]),
    include: {
      sources: {
        include: {
          _count: {
            select: { articles: true }
          }
        }
      }
    }
  });

  return categories.map((category: CategoryWithSourcesRecord) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    articleCount: category.sources.reduce(
      (total: number, source: CategoryWithSourcesRecord["sources"][number]) => total + source._count.articles,
      0
    )
  }));
}

async function fetchArticleRecords(params?: {
  where?: Prisma.ArticleWhereInput;
  orderBy?: Prisma.ArticleOrderByWithRelationInput[];
  skip?: number;
  take?: number;
  cacheTags?: string[];
}): Promise<ArticleRecord[]> {
  const { where, orderBy, skip, take, cacheTags } = params ?? {};

  return readArticleDelegate.findMany({
    where,
    orderBy,
    skip,
    take,
    ...withReadCache(cacheTags ?? ["articles"]),
    include: {
      source: {
        include: {
          category: true
        }
      },
      tags: {
        include: {
          tag: true
        }
      }
    }
  });
}

export async function getLatestArticles(limit = 10): Promise<ArticleCard[]> {
  const records = await fetchArticleRecords({
    where: {
      publishedAt: {
        gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 365)
      }
    },
    orderBy: dbOrderBy("latest"),
    take: Math.max(limit * CANDIDATE_MULTIPLIER, limit),
    cacheTags: ["home:latest"]
  });

  return records.filter((record) => !isLowSignalArticle(record)).slice(0, limit).map(mapArticle);
}

export async function getPopularArticles(limit = 10): Promise<ArticleCard[]> {
  const records = await fetchArticleRecords({
    where: {
      publishedAt: {
        gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 365)
      }
    },
    orderBy: dbOrderBy("popular"),
    take: Math.max(limit * CANDIDATE_MULTIPLIER, limit),
    cacheTags: ["home:popular"]
  });

  return records.filter((record) => !isLowSignalArticle(record)).slice(0, limit).map(mapArticle);
}

export async function getJuniorMustReadArticles(limit = 8): Promise<ArticleCard[]> {
  const records = await fetchArticleRecords({
    where: {
      publishedAt: {
        gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 240)
      }
    },
    orderBy: dbOrderBy("popular"),
    take: Math.max(limit * 50, 200),
    cacheTags: ["home:must-read"]
  });

  return sortRecords(records, "popular")
    .filter((record) => computeJuniorRelevanceScore(record) >= 75)
    .slice(0, limit)
    .map(mapArticle);
}

export async function getRolloutArticles(limit = 8): Promise<ArticleCard[]> {
  const records = await fetchArticleRecords({
    where: {
      publishedAt: {
        gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 120)
      }
    },
    orderBy: dbOrderBy("latest"),
    take: Math.max(limit * 50, 200),
    cacheTags: ["home:rollouts"]
  });

  return sortRecords(records, "latest")
    .filter((record) => computeLearningTracks(record).tracks.includes("New Tech Rollout"))
    .slice(0, limit)
    .map(mapArticle);
}

export async function getCategoryBySlug(slug: string) {
  return readCategoryDelegate.findUnique({
    where: { slug },
    ...withReadCache([`category:${slug}`])
  });
}

export async function getCategoryArticles(params: {
  categorySlug: string;
  page: number;
  sort: SortDirection;
}) {
  const { categorySlug, page, sort } = params;
  const safePage = Math.max(1, page);

  const where: Prisma.ArticleWhereInput = {
    source: {
      category: {
        slug: categorySlug
      }
    }
  };

  const [total, records] = await Promise.all([
    readArticleDelegate.count({
      where,
      ...withReadCache([`category:${categorySlug}:count`])
    }),
    fetchArticleRecords({
      where,
      orderBy: dbOrderBy(sort),
      skip: (safePage - 1) * CATEGORY_PAGE_SIZE,
      take: CATEGORY_PAGE_SIZE,
      cacheTags: [`category:${categorySlug}`, `category:${categorySlug}:sort:${sort}`, `page:${safePage}`]
    })
  ]);

  return {
    items: records.map(mapArticle),
    page: safePage,
    pageSize: CATEGORY_PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / CATEGORY_PAGE_SIZE))
  };
}

export async function getArticleDetailBySlug(slug: string): Promise<ArticleDetail | null> {
  const records = await fetchArticleRecords({
    where: { slug },
    take: 1,
    cacheTags: [`article:${slug}`]
  });
  const record = records[0];

  if (!record) {
    return null;
  }

  return {
    ...mapArticle(record),
    url: record.url
  };
}

export async function searchArticles(params: {
  query: string;
  categorySlug?: string;
  page: number;
  sort?: SortDirection;
}) {
  const { query, categorySlug, page, sort = "popular" } = params;
  const normalizedQuery = query.trim();
  const safePage = Math.max(1, page);

  const where: Prisma.ArticleWhereInput = {
    ...(normalizedQuery
      ? {
          title: {
            contains: normalizedQuery,
            mode: "insensitive" as const
          }
        }
      : {}),
    ...(categorySlug && categorySlug !== "all"
      ? {
          source: {
            category: {
              slug: categorySlug
            }
          }
        }
      : {})
  };

  const [total, records] = await Promise.all([
    readArticleDelegate.count({
      where,
      ...withReadCache([`search:${normalizedQuery || "all"}`, `search:category:${categorySlug ?? "all"}:count`])
    }),
    fetchArticleRecords({
      where,
      orderBy: dbOrderBy(sort),
      skip: (safePage - 1) * SEARCH_PAGE_SIZE,
      take: SEARCH_PAGE_SIZE,
      cacheTags: [
        `search:${normalizedQuery || "all"}`,
        `search:category:${categorySlug ?? "all"}`,
        `search:sort:${sort}`,
        `page:${safePage}`
      ]
    })
  ]);

  return {
    items: records.map(mapArticle),
    total,
    totalPages: Math.max(1, Math.ceil(total / SEARCH_PAGE_SIZE)),
    page: safePage,
    pageSize: SEARCH_PAGE_SIZE
  };
}

export async function getFetchedArticlesByWindow(params: {
  startedAt: Date;
  finishedAt: Date;
  page: number;
}) {
  const { startedAt, finishedAt, page } = params;
  const safePage = Math.max(1, page);

  const where: Prisma.ArticleWhereInput = {
    createdAt: {
      gte: startedAt,
      lte: finishedAt
    }
  };

  const [total, records] = await Promise.all([
    readArticleDelegate.count({
      where,
      ...withReadCache(["ingestion:window:count"])
    }),
    fetchArticleRecords({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip: (safePage - 1) * INGESTION_PAGE_SIZE,
      take: INGESTION_PAGE_SIZE,
      cacheTags: ["ingestion:window", `page:${safePage}`]
    })
  ]);

  return {
    items: records.map(mapArticle),
    total,
    totalPages: Math.max(1, Math.ceil(total / INGESTION_PAGE_SIZE)),
    page: safePage,
    pageSize: INGESTION_PAGE_SIZE
  };
}
