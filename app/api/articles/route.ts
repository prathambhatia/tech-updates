import { NextResponse } from "next/server";

import type { ArticleDetail } from "@/types/article";
import { getBySlug } from "@/services/article.service";

type ArticleResponse = {
  article: ArticleDetail | null;
};

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const slug = (url.searchParams.get("slug") ?? "").trim();

    if (!slug) {
      return NextResponse.json(
        {
          error: "Missing required query param: slug"
        },
        {
          status: 400
        }
      );
    }

    const article = await getBySlug(slug, {
      ttlSeconds: 86400,
      swrSeconds: 3600
    });

    const response: ArticleResponse = { article };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, s-maxage=86400"
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch article"
      },
      {
        status: 500
      }
    );
  }
}
