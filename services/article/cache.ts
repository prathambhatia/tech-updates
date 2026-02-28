import { prisma, prismaRead } from "@/lib/db";

export const READ_CACHE_SECONDS = 120;
export const READ_CACHE_STALE_SECONDS = 300;

export const readArticleDelegate = (prismaRead ?? prisma).article as any;
export const readCategoryDelegate = (prismaRead ?? prisma).category as any;

export type ReadCacheOptions = {
  ttlSeconds?: number;
  swrSeconds?: number;
};

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

export function withReadCache(tags: string[], options?: ReadCacheOptions) {
  if (!prismaRead) {
    return {};
  }

  const normalizedTags = [...new Set(["articles", ...tags].map(toValidCacheTag))].slice(0, 5);
  const ttl = options?.ttlSeconds ?? READ_CACHE_SECONDS;
  const swr = options?.swrSeconds ?? READ_CACHE_STALE_SECONDS;

  return {
    cacheStrategy: {
      ttl,
      swr,
      tags: normalizedTags.length > 0 ? normalizedTags : ["articles"]
    }
  };
}
