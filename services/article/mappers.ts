import { env } from "@/lib/env";
import {
  asFiniteNumber,
  computeJuniorRelevanceScore,
  computeLearningTracks,
  computePopularityScore,
  effectiveReadingTime,
  importanceLevel,
  resolvedBreakthroughScore,
  resolvedHotTopicScore
} from "@/services/article/scoring";
import type { ArticleRecord } from "@/types/services/article.types";
import type { ArticleCard } from "@/types/article";

export function mapArticle(record: ArticleRecord): ArticleCard {
  const tracks = computeLearningTracks(record).tracks;
  const juniorScore = asFiniteNumber(computeJuniorRelevanceScore(record), 0);
  const breakthroughScore = resolvedBreakthroughScore(record);
  const hotTopicScore = resolvedHotTopicScore(record);
  const readingTime = effectiveReadingTime(record);
  const popularityScore = env.POPULARITY_V2_ENABLED
    ? asFiniteNumber(record.popularityScoreV2, 0)
    : asFiniteNumber(computePopularityScore(record), 0);

  return {
    id: record.id,
    title: record.title,
    slug: record.slug,
    summary: record.summary,
    contentPreview: record.contentPreview,
    author: record.author,
    publishedAt: record.publishedAt,
    readingTime,
    sourceName: record.source.name,
    categoryName: record.category?.name ?? record.source.category.name,
    categorySlug: record.category?.slug ?? record.source.category.slug,
    tags: record.tags.map((binding) => binding.tag.name),
    popularityScore,
    popularityScoreV2: asFiniteNumber(record.popularityScoreV2, 0),
    popularityConfidence: asFiniteNumber(record.popularityConfidence, 0),
    juniorRelevanceScore: juniorScore,
    externalPopularityScore: asFiniteNumber(record.externalPopularityScore, 0),
    viralVelocityScore: asFiniteNumber(record.viralVelocityScore, 0),
    breakthroughScore,
    hotTopicScore,
    learningTracks: tracks,
    importanceLevel: importanceLevel(juniorScore)
  };
}
