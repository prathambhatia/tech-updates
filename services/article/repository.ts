import type { Prisma } from "@prisma/client";

import {
  readArticleDelegate,
  readCategoryDelegate,
  withReadCache
} from "@/services/article/cache";
import type { ArticleRecord, CategoryWithSourcesRecord } from "@/types/services/article.types";

export async function getCategoryCardsRecords(): Promise<CategoryWithSourcesRecord[]> {
  return readCategoryDelegate.findMany({
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
}

export async function getCategoryBySlugRecord(slug: string) {
  return readCategoryDelegate.findUnique({
    where: { slug },
    ...withReadCache([`category:${slug}`])
  });
}

export async function fetchArticleRecords(params?: {
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

export async function countArticles(where: Prisma.ArticleWhereInput, cacheTags: string[]): Promise<number> {
  return readArticleDelegate.count({
    where,
    ...withReadCache(cacheTags)
  });
}
