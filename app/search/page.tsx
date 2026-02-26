import { ArticleListItem } from "@/components/article-list-item";
import { PaginationLinks } from "@/components/pagination-links";
import { SearchFilters } from "@/components/search-filters";
import { getCategoryCards, searchArticles } from "@/services/article.service";
import type { SortDirection } from "@/types/article";

type SearchPageProps = {
  searchParams: {
    q?: string;
    category?: string;
    sort?: string;
    page?: string;
  };
};

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

  const [categories, result] = await Promise.all([
    getCategoryCards(),
    searchArticles({
      query: q,
      categorySlug: category,
      sort,
      page
    })
  ]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-ink-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-[0_16px_36px_rgba(2,8,23,0.45)]">
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
