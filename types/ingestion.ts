export type IngestionArticleInput = {
  title: string;
  url: string;
  author: string | null;
  publishedAt: Date;
  summary: string;
  contentPreview: string;
  readingTime: number;
  tags: string[];
};

export type SourceIngestionResult = {
  sourceId: string;
  sourceName: string;
  fetchedCount: number;
  createdCount: number;
  skippedCount: number;
  errors: string[];
};

export type IngestAllResult = {
  startedAt: string;
  finishedAt: string;
  sourceCount: number;
  fetchedCount: number;
  createdCount: number;
  skippedCount: number;
  results: SourceIngestionResult[];
};
