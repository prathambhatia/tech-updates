import { CANDIDATE_MULTIPLIER } from "@/services/article/constants";
import { mapArticle } from "@/services/article/mappers";
import { dbOrderBy, sortRecords } from "@/services/article/ordering";
import {
  computeJuniorRelevanceScore,
  computeLearningTracks,
  isLowSignalArticle
} from "@/services/article/scoring";
import { fetchArticleRecords } from "@/services/article/repository";
import type { ArticleCard } from "@/types/article";

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
