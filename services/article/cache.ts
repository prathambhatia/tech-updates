import { prisma, prismaRead } from "@/lib/db";

export const READ_CACHE_SECONDS = 120;
export const READ_CACHE_STALE_SECONDS = 300;

export const readArticleDelegate = (prismaRead ?? prisma).article as any;
export const readCategoryDelegate = (prismaRead ?? prisma).category as any;

export function withReadCache(tags: string[]) {
  if (!prismaRead) {
    return {};
  }

  return {
    cacheStrategy: {
      ttl: READ_CACHE_SECONDS,
      swr: READ_CACHE_STALE_SECONDS,
      tags
    }
  };
}
