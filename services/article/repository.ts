import type { Prisma } from "@prisma/client";

import {
  type ReadCacheOptions,
  readArticleDelegate,
  readCategoryDelegate,
  withReadCache
} from "@/services/article/cache";
import { DISPLAY_CATEGORY_SLUGS } from "@/services/article/category-classifier";
import type { ArticleRecord, CategoryWithSourcesRecord } from "@/types/services/article.types";

export async function getCategoryCardsRecords(cache?: ReadCacheOptions): Promise<CategoryWithSourcesRecord[]> {
  return readCategoryDelegate.findMany({
    where: {
      slug: {
        in: [...DISPLAY_CATEGORY_SLUGS]
      }
    },
    orderBy: { name: "asc" },
    ...withReadCache(["categories"], cache),
    include: {
      _count: {
        select: {
          articles: true
        }
      }
    }
  });
}

export async function getCategoryBySlugRecord(slug: string, cache?: ReadCacheOptions) {
  if (!DISPLAY_CATEGORY_SLUGS.includes(slug as (typeof DISPLAY_CATEGORY_SLUGS)[number])) {
    return null;
  }

  return readCategoryDelegate.findUnique({
    where: { slug },
    ...withReadCache([`category:${slug}`], cache)
  });
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

  return readArticleDelegate.findMany({
    where,
    orderBy,
    skip,
    take,
    ...withReadCache(cacheTags ?? ["articles"], cache),
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
    }
  });
}

export async function countArticles(
  where: Prisma.ArticleWhereInput,
  cacheTags: string[],
  cache?: ReadCacheOptions
): Promise<number> {
  return readArticleDelegate.count({
    where,
    ...withReadCache(cacheTags, cache)
  });
}
