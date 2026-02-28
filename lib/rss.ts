import Parser from "rss-parser";

import type { FeedItem, ParsedRssItem } from "@/types/lib/rss.types";
import { inferExplicitDateFromText } from "@/utils/date";

const parser = new Parser<Record<string, never>, FeedItem>({
  timeout: 20_000,
  customFields: {
    item: ["dc:creator", "content:encoded", "creator"]
  }
});

function stripHtml(input: string): string {
  return input.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function wordCount(input: string): number {
  return input.split(/\s+/).filter(Boolean).length;
}

function pickRichestText(parts: Array<string | undefined>): string {
  const cleaned = parts
    .map((part) => (part ? stripHtml(part) : ""))
    .filter((part) => part.length > 0);

  if (cleaned.length === 0) {
    return "";
  }

  return cleaned.sort((a, b) => wordCount(b) - wordCount(a))[0] ?? "";
}

export async function parseFeed(rssUrl: string): Promise<ParsedRssItem[]> {
  const feed = await parser.parseURL(rssUrl);

  return (feed.items ?? [])
    .map((item): ParsedRssItem | null => {
      if (!item.title?.trim() || !item.link?.trim()) {
        return null;
      }

      const publishedAt = item.isoDate ?? item.pubDate;
      const rawText = pickRichestText([item["content:encoded"], item.content, item.contentSnippet, item.title]);
      const parsedPublishedAt = publishedAt ? new Date(publishedAt) : null;
      const inferredPublishedAt = inferExplicitDateFromText(`${item.title ?? ""} ${rawText}`);
      const safePublishedAt =
        parsedPublishedAt && !Number.isNaN(parsedPublishedAt.getTime()) ? parsedPublishedAt : inferredPublishedAt ?? new Date();

      return {
        title: item.title.trim(),
        url: item.link.trim(),
        author: item.creator?.trim() ?? item["dc:creator"]?.trim() ?? null,
        publishedAt: safePublishedAt,
        rawText,
        tags: item.categories?.map((tag) => tag.trim()).filter(Boolean) ?? []
      };
    })
    .filter((item): item is ParsedRssItem => Boolean(item));
}
