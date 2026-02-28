import Link from "next/link";

import { ArticleListItem } from "@/components/article-list-item";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { PaginationLinks } from "@/components/pagination-links";
import { SearchFilters } from "@/components/search-filters";
import { SEARCH_PAGE_SIZE } from "@/services/article/constants";
import type { SearchPageProps } from "@/types/app/search-page.types";
import type { ArticleCard, CategoryCard, SortDirection } from "@/types/article";

export const revalidate = 86400;

type SearchApiResponse = {
  articles: Array<Omit<ArticleCard, "publishedAt"> & { publishedAt: string }>;
  total: number;
};

type CategoriesApiResponse = {
  categories: CategoryCard[];
};

function toBaseUrl(): string {
  const explicit = process.env["NEXT_PUBLIC_SITE_URL"]?.trim();
  if (explicit) {
    return explicit.replace(/\/+$/, "");
  }

  const vercel = process.env["VERCEL_URL"]?.trim();
  if (vercel) {
    return `https://${vercel}`;
  }

  return "http://localhost:3000";
}

function toArticleCard(article: Omit<ArticleCard, "publishedAt"> & { publishedAt: string }): ArticleCard {
  return {
    ...article,
    publishedAt: new Date(article.publishedAt)
  };
}

function parsePage(input: string | undefined): number {
  const parsed = Number.parseInt(input ?? "1", 10);
  return Number.isNaN(parsed) ? 1 : Math.max(1, parsed);
}

function parseSort(input: string | undefined): SortDirection {
  if (input === "latest") {
    return "latest";
  }

  if (input === "oldest") {
    return "oldest";
  }

  return "popular";
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const q = searchParams.q?.trim() ?? "";
  const category = searchParams.category?.trim() || "all";
  const sort = parseSort(searchParams.sort);
  const page = parsePage(searchParams.page);

  const baseUrl = toBaseUrl();
  const offset = (page - 1) * SEARCH_PAGE_SIZE;
  const queryParams = new URLSearchParams({
    q,
    category,
    sort,
    limit: String(SEARCH_PAGE_SIZE),
    offset: String(offset)
  });

  const [categoriesResponse, searchResponse] = await Promise.all([
    fetch(`${baseUrl}/api/categories`, {
      next: { revalidate: 86400 }
    }),
    fetch(`${baseUrl}/api/search?${queryParams.toString()}`, {
      next: { revalidate: 86400 }
    })
  ]);

  if (!categoriesResponse.ok || !searchResponse.ok) {
    throw new Error("Failed to load search data");
  }

  const categoriesPayload = (await categoriesResponse.json()) as CategoriesApiResponse;
  const searchPayload = (await searchResponse.json()) as SearchApiResponse;
  const categories = categoriesPayload.categories;
  const result = {
    items: searchPayload.articles.map(toArticleCard),
    total: searchPayload.total,
    totalPages: Math.max(1, Math.ceil(searchPayload.total / SEARCH_PAGE_SIZE)),
    page
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-ink-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-[0_16px_36px_rgba(2,8,23,0.45)]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Search" }]} />
          <Link
            href="/"
            className="text-sm font-semibold text-ink-700 hover:text-accent-600 dark:text-slate-200 dark:hover:text-teal-200"
          >
            Back to Home
          </Link>
        </div>
        <h1 className="font-display text-4xl font-semibold text-ink-900 dark:text-slate-100">Discover Articles</h1>
        <p className="mt-3 text-sm text-ink-600 dark:text-slate-400">
          Select a category to browse instantly, or add a keyword to narrow results.
        </p>
        <SearchFilters
          initialQuery={q}
          initialCategory={category}
          initialSort={sort}
          categories={categories.map((item) => ({
            slug: item.slug,
            name: item.name
          }))}
        />
      </div>
      {result.items.length === 0 ? (
        <p className="rounded-xl border border-ink-200 bg-white p-6 text-ink-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
          No results found for this selection.
        </p>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-ink-600 dark:text-slate-300">
            {result.total} matches • sorted by {sort}.
          </p>
          <div className="grid gap-4">
            {result.items.map((article) => (
              <ArticleListItem key={article.id} article={article} />
            ))}
          </div>
          <PaginationLinks
            page={result.page}
            totalPages={result.totalPages}
            createHref={(targetPage) =>
              `/search?q=${encodeURIComponent(q)}&category=${encodeURIComponent(category)}&sort=${encodeURIComponent(sort)}&page=${targetPage}`
            }
          />
        </div>
      )}
    </div>
  );
}
