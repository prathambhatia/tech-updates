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
import type { CategoryWithSourcesRecord } from "@/services/article/types";
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
    articleCount: category.sources.reduce(
      (total: number, source: CategoryWithSourcesRecord["sources"][number]) => total + source._count.articles,
      0
    )
  }));
}

export async function getCategoryBySlug(slug: string) {
  return getCategoryBySlugRecord(slug);
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
    countArticles(where, [`category:${categorySlug}:count`]),
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
    countArticles(where, [`search:${normalizedQuery || "all"}`, `search:category:${categorySlug ?? "all"}:count`]),
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
