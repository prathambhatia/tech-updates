import { NextResponse } from "next/server";

import type { CategoryCard } from "@/types/article";
import { getCategories } from "@/services/article.service";

type CategoriesResponse =
  | {
      categories: CategoryCard[];
    }
  | {
      category: CategoryCard | null;
    };

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const name = (url.searchParams.get("name") ?? "").trim();

    const result = await getCategories({
      name: name || undefined,
      cache: {
        ttlSeconds: 86400,
        swrSeconds: 3600
      }
    });

    const response: CategoriesResponse = name
      ? { category: (result as CategoryCard | null) ?? null }
      : { categories: (result as CategoryCard[]) ?? [] };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, s-maxage=86400"
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch categories"
      },
      {
        status: 500
      }
    );
  }
}
