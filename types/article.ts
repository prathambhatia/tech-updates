export type SortDirection = "popular" | "latest" | "oldest";

export type ArticleCard = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  contentPreview: string | null;
  author: string | null;
  publishedAt: Date;
  readingTime: number;
  sourceName: string;
  categoryName: string;
  categorySlug: string;
  tags: string[];
  popularityScore: number;
  popularityScoreV2: number;
  popularityConfidence: number;
  juniorRelevanceScore: number;
  externalPopularityScore: number;
  viralVelocityScore: number;
  breakthroughScore: number;
  hotTopicScore: number;
  learningTracks: string[];
  importanceLevel: "must-read" | "recommended" | "optional";
};

export type CategoryCard = {
  id: string;
  name: string;
  slug: string;
  articleCount: number;
};

export type ArticleDetail = ArticleCard & {
  url: string;
};
