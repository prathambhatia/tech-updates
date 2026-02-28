import { prisma, prismaRead } from "@/lib/db";

export const READ_CACHE_SECONDS = 120;
export const READ_CACHE_STALE_SECONDS = 300;

export const readArticleDelegate = (prismaRead ?? prisma).article as any;
export const readCategoryDelegate = (prismaRead ?? prisma).category as any;

function toValidCacheTag(tag: string): string {
  const normalized = tag
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (!normalized) {
    return "articles";
  }

  return normalized.slice(0, 64);
}

export function withReadCache(tags: string[]) {
  if (!prismaRead) {
    return {};
  }

  const normalizedTags = [...new Set(tags.map(toValidCacheTag))].slice(0, 5);

  return {
    cacheStrategy: {
      ttl: READ_CACHE_SECONDS,
      swr: READ_CACHE_STALE_SECONDS,
      tags: normalizedTags.length > 0 ? normalizedTags : ["articles"]
    }
  };
}
