export type ParsedRssItem = {
  title: string;
  url: string;
  author: string | null;
  publishedAt: Date;
  rawText: string;
  tags: string[];
};

export type FeedItem = {
  title?: string;
  link?: string;
  pubDate?: string;
  isoDate?: string;
  creator?: string;
  "dc:creator"?: string;
  content?: string;
  "content:encoded"?: string;
  contentSnippet?: string;
  categories?: string[];
};
