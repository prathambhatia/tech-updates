import type { Prisma } from "@prisma/client";

import {
  type ReadCacheOptions,
  isAccelerateConnectivityError,
  readArticleDelegate,
  readCategoryDelegate,
  withReadCache
} from "@/services/article/cache";
import { prisma } from "@/lib/db";
import { DISPLAY_CATEGORY_SLUGS } from "@/services/article/category-classifier";
import type { ArticleRecord, CategoryWithSourcesRecord } from "@/types/services/article.types";

async function runCategoryReadWithFallback<T>(query: (delegate: typeof readCategoryDelegate, disableCache: boolean) => Promise<T>) {
  try {
    return await query(readCategoryDelegate, false);
  } catch (error) {
    if (!isAccelerateConnectivityError(error)) {
      throw error;
    }
    return query(prisma.category as any, true);
  }
}

async function runArticleReadWithFallback<T>(query: (delegate: typeof readArticleDelegate, disableCache: boolean) => Promise<T>) {
  try {
    return await query(readArticleDelegate, false);
  } catch (error) {
    if (!isAccelerateConnectivityError(error)) {
      throw error;
    }
    return query(prisma.article as any, true);
  }
}

export async function getCategoryCardsRecords(cache?: ReadCacheOptions): Promise<CategoryWithSourcesRecord[]> {
  return runCategoryReadWithFallback((delegate, disableCache) =>
    delegate.findMany({
      where: {
        slug: {
          in: [...DISPLAY_CATEGORY_SLUGS]
        }
      },
      orderBy: { name: "asc" },
      ...withReadCache(["categories"], cache, disableCache),
      include: {
        _count: {
          select: {
            articles: true
          }
        }
      }
    })
  );
}

export async function getCategoryBySlugRecord(slug: string, cache?: ReadCacheOptions) {
  if (!DISPLAY_CATEGORY_SLUGS.includes(slug as (typeof DISPLAY_CATEGORY_SLUGS)[number])) {
    return null;
  }

  return runCategoryReadWithFallback((delegate, disableCache) =>
    delegate.findUnique({
      where: { slug },
      ...withReadCache([`category:${slug}`], cache, disableCache)
    })
  );
}

export async function fetchArticleRecords(params?: {
  where?: Prisma.ArticleWhereInput;
  orderBy?: Prisma.ArticleOrderByWithRelationInput[];
  skip?: number;
  take?: number;
  cacheTags?: string[];
  cache?: ReadCacheOptions;
}): Promise<ArticleRecord[]> {
  const { where, orderBy, skip, take, cacheTags, cache } = params ?? {};

  return runArticleReadWithFallback((delegate, disableCache) =>
    delegate.findMany({
      where,
      orderBy,
      skip,
      take,
      ...withReadCache(cacheTags ?? ["articles"], cache, disableCache),
      include: {
        category: true,
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
      },
    })
  );
}

export async function countArticles(
  where: Prisma.ArticleWhereInput,
  cacheTags: string[],
  cache?: ReadCacheOptions
): Promise<number> {
  return runArticleReadWithFallback((delegate, disableCache) =>
    delegate.count({
      where,
      ...withReadCache(cacheTags, cache, disableCache)
    })
  );
}
