export type SignalResult = {
  hnScore: number;
  redditScore: number;
  xScore: number;
  githubScore: number;
  totalScore: number;
};

export type RefreshResult = {
  checkedCount: number;
  updatedCount: number;
  errors: string[];
  trendingKeywords: string[];
};

export type BackfillResult = {
  checkedCount: number;
  updatedCount: number;
};

export type PopularityV2Input = {
  publishedAt: Date;
  externalPopularityScore: number;
  externalPopularityPrevScore: number;
  viralVelocityScore: number;
  hotTopicScore: number;
  breakthroughScore: number;
  popularityLastCheckedAt?: Date | null;
  sourceName?: string | null;
  readingTime?: number | null;
  title?: string | null;
  summary?: string | null;
  contentPreview?: string | null;
  tags?: string[];
};
