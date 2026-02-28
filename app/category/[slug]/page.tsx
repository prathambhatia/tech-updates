import Link from "next/link";
import { notFound } from "next/navigation";

import { ArticleListItem } from "@/components/article-list-item";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { PaginationLinks } from "@/components/pagination-links";
import { CATEGORY_PAGE_SIZE } from "@/services/article/constants";
import type { CategoryPageProps } from "@/types/app/category-page.types";
import type { ArticleCard, CategoryCard, SortDirection } from "@/types/article";

export const revalidate = 86400;

type CategoryApiResponse = {
  category: CategoryCard | null;
};

type SearchApiResponse = {
  articles: Array<Omit<ArticleCard, "publishedAt"> & { publishedAt: string }>;
  total: number;
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

function toSort(value: string | undefined): SortDirection {
  if (value === "latest") {
    return "latest";
  }

  if (value === "oldest") {
    return "oldest";
  }

  return "popular";
}

function toPage(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isNaN(parsed) ? 1 : Math.max(1, parsed);
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const baseUrl = toBaseUrl();
  const categoryResponse = await fetch(
    `${baseUrl}/api/categories?${new URLSearchParams({ name: params.slug }).toString()}`,
    {
      next: { revalidate: 86400 }
    }
  );

  if (!categoryResponse.ok) {
    notFound();
  }

  const categoryPayload = (await categoryResponse.json()) as CategoryApiResponse;
  const category = categoryPayload.category;

  if (!category) {
    notFound();
  }

  const sort = toSort(searchParams.sort);
  const page = toPage(searchParams.page);
  const offset = (page - 1) * CATEGORY_PAGE_SIZE;
  const searchQuery = new URLSearchParams({
    q: "",
    category: category.slug,
    sort,
    limit: String(CATEGORY_PAGE_SIZE),
    offset: String(offset)
  });
  const articlesResponse = await fetch(`${baseUrl}/api/search?${searchQuery.toString()}`, {
    next: { revalidate: 86400 }
  });

  if (!articlesResponse.ok) {
    throw new Error("Failed to load category articles");
  }

  const articlesPayload = (await articlesResponse.json()) as SearchApiResponse;
  const result = {
    items: articlesPayload.articles.map(toArticleCard),
    page,
    total: articlesPayload.total,
    totalPages: Math.max(1, Math.ceil(articlesPayload.total / CATEGORY_PAGE_SIZE))
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-ink-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-[0_16px_36px_rgba(2,8,23,0.45)]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "Categories", href: "/#categories" },
              { label: category.name }
            ]}
          />
          <Link
            href="/"
            className="text-sm font-semibold text-ink-700 hover:text-accent-600 dark:text-slate-200 dark:hover:text-teal-200"
          >
            Back to Home
          </Link>
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-500 dark:text-slate-400">Category</p>
        <h1 className="mt-2 font-display text-4xl font-semibold text-ink-900 dark:text-slate-100">{category.name}</h1>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href={`/category/${category.slug}?sort=popular&page=1`}
            className={`rounded-full border px-3 py-1 text-sm font-medium ${
              sort === "popular"
                ? "border-accent-600 bg-accent-600 text-white"
                : "border-ink-300 text-ink-700 hover:border-accent-600 hover:text-accent-600 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-200 dark:hover:border-teal-300 dark:hover:text-teal-200"
            }`}
          >
            Popular
          </Link>
          <Link
            href={`/category/${category.slug}?sort=latest&page=1`}
            className={`rounded-full border px-3 py-1 text-sm font-medium ${
              sort === "latest"
                ? "border-accent-600 bg-accent-600 text-white"
                : "border-ink-300 text-ink-700 hover:border-accent-600 hover:text-accent-600 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-200 dark:hover:border-teal-300 dark:hover:text-teal-200"
            }`}
          >
            Latest
          </Link>
          <Link
            href={`/category/${category.slug}?sort=oldest&page=1`}
            className={`rounded-full border px-3 py-1 text-sm font-medium ${
              sort === "oldest"
                ? "border-accent-600 bg-accent-600 text-white"
                : "border-ink-300 text-ink-700 hover:border-accent-600 hover:text-accent-600 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-200 dark:hover:border-teal-300 dark:hover:text-teal-200"
            }`}
          >
            Oldest
          </Link>
        </div>
      </div>

      {result.items.length === 0 ? (
        <p className="rounded-xl border border-ink-200 bg-white p-6 text-ink-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
          No articles found for this category yet.
        </p>
      ) : (
        <div className="grid gap-4">
          {result.items.map((article) => (
            <ArticleListItem key={article.id} article={article} />
          ))}
        </div>
      )}

      <PaginationLinks
        page={result.page}
        totalPages={result.totalPages}
        createHref={(targetPage) => `/category/${category.slug}?sort=${sort}&page=${targetPage}`}
      />
    </div>
  );
}
