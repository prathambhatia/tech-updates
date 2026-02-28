import type { Prisma } from "@prisma/client";

import {
  CATEGORY_PAGE_SIZE,
  INGESTION_PAGE_SIZE,
  SEARCH_PAGE_SIZE
} from "@/services/article/constants";
import {
  getJuniorMustReadArticles,
  getLatestArticles,
  getPopularArticles,
  getRolloutArticles
} from "@/services/article/home.service";
import { mapArticle } from "@/services/article/mappers";
import { dbOrderBy } from "@/services/article/ordering";
import type { ReadCacheOptions } from "@/services/article/cache";
import type { CategoryWithSourcesRecord } from "@/types/services/article.types";
import {
  countArticles,
  fetchArticleRecords,
  getCategoryBySlugRecord,
  getCategoryCardsRecords
} from "@/services/article/repository";
import type { ArticleCard, ArticleDetail, CategoryCard, SortDirection } from "@/types/article";

export {
  getJuniorMustReadArticles,
  getLatestArticles,
  getPopularArticles,
  getRolloutArticles
} from "@/services/article/home.service";

export async function getCategoryCards(): Promise<CategoryCard[]> {
  const categories = await getCategoryCardsRecords();

  return categories.map((category: CategoryWithSourcesRecord) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    articleCount: category._count.articles
  }));
}

export async function getCategoryBySlug(slug: string) {
  return getCategoryBySlugRecord(slug);
}

export async function getCategories(params?: {
  name?: string;
  cache?: ReadCacheOptions;
}): Promise<CategoryCard[] | CategoryCard | null> {
  const allCategories = await getCategoryCardsRecords(params?.cache);
  const mapped = allCategories.map((category: CategoryWithSourcesRecord) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    articleCount: category._count.articles
  }));

  const requestedName = params?.name?.trim();
  if (!requestedName) {
    return mapped;
  }

  const normalizedRequestedName = requestedName.toLowerCase();
  return (
    mapped.find(
      (category) =>
        category.slug.toLowerCase() === normalizedRequestedName ||
        category.name.toLowerCase() === normalizedRequestedName
    ) ?? null
  );
}

export async function getCategoryArticles(params: {
  categorySlug: string;
  page: number;
  sort: SortDirection;
  cache?: ReadCacheOptions;
}) {
  const { categorySlug, page, sort, cache } = params;
  const safePage = Math.max(1, page);

  const where: Prisma.ArticleWhereInput = {
    category: {
      slug: categorySlug
    }
  };

  const [total, records] = await Promise.all([
    countArticles(where, [`category:${categorySlug}:count`], cache),
    fetchArticleRecords({
      where,
      orderBy: dbOrderBy(sort),
      skip: (safePage - 1) * CATEGORY_PAGE_SIZE,
      take: CATEGORY_PAGE_SIZE,
      cacheTags: [`category:${categorySlug}`, `category:${categorySlug}:sort:${sort}`, `page:${safePage}`],
      cache
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
  return getBySlug(slug);
}

export async function getBySlug(
  slug: string,
  cache?: ReadCacheOptions
): Promise<ArticleDetail | null> {
  const records = await fetchArticleRecords({
    where: { slug },
    take: 1,
    cacheTags: [`article:${slug}`],
    cache
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
  const safePage = Math.max(1, params.page);
  const result = await search({
    query: params.query,
    categorySlug: params.categorySlug,
    sort: params.sort,
    limit: SEARCH_PAGE_SIZE,
    offset: (safePage - 1) * SEARCH_PAGE_SIZE
  });

  return {
    items: result.articles,
    total: result.total,
    totalPages: Math.max(1, Math.ceil(result.total / SEARCH_PAGE_SIZE)),
    page: safePage,
    pageSize: SEARCH_PAGE_SIZE
  };
}

export async function search(params: {
  query: string;
  categorySlug?: string;
  limit?: number;
  offset?: number;
  sort?: SortDirection;
  cache?: ReadCacheOptions;
}) {
  const { query, categorySlug, limit = SEARCH_PAGE_SIZE, offset = 0, sort = "popular", cache } = params;
  const normalizedQuery = query.trim();
  const safeLimit = Math.max(1, Math.min(100, Math.floor(limit)));
  const safeOffset = Math.max(0, Math.floor(offset));

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
          category: {
            slug: categorySlug
          }
        }
      : {})
  };

  const [total, records] = await Promise.all([
    countArticles(where, [`search:${normalizedQuery || "all"}`, `search:category:${categorySlug ?? "all"}:count`], cache),
    fetchArticleRecords({
      where,
      orderBy: dbOrderBy(sort),
      skip: safeOffset,
      take: safeLimit,
      cacheTags: [
        `search:${normalizedQuery || "all"}`,
        `search:category:${categorySlug ?? "all"}`,
        `search:sort:${sort}`,
        `offset:${safeOffset}`
      ],
      cache
    })
  ]);

  return {
    articles: records.map(mapArticle),
    total,
    limit: safeLimit,
    offset: safeOffset
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
    countArticles(where, ["ingestion:window:count"]),
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
