import { NextResponse } from "next/server";

import type { ArticleCard } from "@/types/article";
import { search } from "@/services/article.service";

type SearchResponse = {
  articles: ArticleCard[];
  total: number;
};

function toPositiveInteger(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
}

function toSort(value: string | null): "popular" | "latest" | "oldest" {
  if (value === "latest" || value === "oldest") {
    return value;
  }
  return "popular";
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get("q") ?? "";
    const limit = toPositiveInteger(url.searchParams.get("limit"), 20);
    const offset = toPositiveInteger(url.searchParams.get("offset"), 0);
    const categorySlug = url.searchParams.get("category") ?? undefined;
    const sort = toSort(url.searchParams.get("sort"));

    const result = await search({
      query: q,
      categorySlug,
      sort,
      limit,
      offset,
      cache: {
        ttlSeconds: 86400,
        swrSeconds: 3600
      }
    });

    const response: SearchResponse = {
      articles: result.articles,
      total: result.total
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, s-maxage=86400"
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to search articles"
      },
      {
        status: 500
      }
    );
  }
}
