export type AdminDailyFetchBucket = {
  date: string;
  windowStart: Date;
  windowEnd: Date;
  newBlogsCount: number;
};

export type AdminRecentFetchedArticle = {
  id: string;
  title: string;
  slug: string;
  sourceName: string;
  categoryName: string;
  createdAt: Date;
};

export type AdminIngestionReport = {
  generatedAt: Date;
  periodDays: number;
  totalNewBlogs: number;
  dayBuckets: AdminDailyFetchBucket[];
  recentFetchedArticles: AdminRecentFetchedArticle[];
};
