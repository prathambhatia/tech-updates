import type { Prisma } from "@prisma/client";

import { env } from "@/lib/env";
import {
  asFiniteNumber,
  computeJuniorRelevanceScore,
  computePopularityScore,
  isLowSignalArticle
} from "@/services/article/scoring";
import type { ArticleRecord } from "@/services/article/types";
import type { SortDirection } from "@/types/article";

export function sortRecords(records: ArticleRecord[], sort: SortDirection): ArticleRecord[] {
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

export function dbOrderBy(sort: SortDirection): Prisma.ArticleOrderByWithRelationInput[] {
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
