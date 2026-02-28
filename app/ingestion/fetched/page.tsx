import { ArticleListItem } from "@/components/article-list-item";
import { PaginationLinks } from "@/components/pagination-links";
import { getFetchedArticlesByWindow } from "@/services/article.service";
import { formatDate } from "@/utils/date";
import type { FetchedIngestionPageProps } from "@/types/app/ingestion-fetched-page.types";

function parsePage(input: string | undefined): number {
  const parsed = Number.parseInt(input ?? "1", 10);
  return Number.isNaN(parsed) ? 1 : Math.max(1, parsed);
}

function parseIsoDate(input: string | undefined): Date | null {
  if (!input?.trim()) {
    return null;
  }

  const parsed = new Date(input);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export default async function FetchedIngestionPage({ searchParams }: FetchedIngestionPageProps) {
  const startedAt = parseIsoDate(searchParams.startedAt);
  const finishedAt = parseIsoDate(searchParams.finishedAt);
  const page = parsePage(searchParams.page);

  if (!startedAt || !finishedAt || finishedAt.getTime() < startedAt.getTime()) {
    return (
      <div className="space-y-4 rounded-2xl border border-ink-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/70">
        <h1 className="font-display text-3xl font-semibold text-ink-900 dark:text-slate-100">Fetched Articles</h1>
        <p className="text-sm text-ink-600 dark:text-slate-300">
          This fetch result link is invalid or expired. Run a new fetch from the header and open results again.
        </p>
      </div>
    );
  }

  const result = await getFetchedArticlesByWindow({
    startedAt,
    finishedAt,
    page
  });

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-ink-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/70">
        <h1 className="font-display text-3xl font-semibold text-ink-900 dark:text-slate-100">Fetched Articles</h1>
        <p className="mt-2 text-sm text-ink-600 dark:text-slate-300">
          {result.total} new articles created between {formatDate(startedAt)} and {formatDate(finishedAt)}.
        </p>
      </section>

      {result.items.length === 0 ? (
        <p className="rounded-xl border border-ink-200 bg-white p-6 text-ink-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
          No newly created articles were found for this fetch window.
        </p>
      ) : (
        <section className="space-y-4">
          <div className="grid gap-4">
            {result.items.map((article) => (
              <ArticleListItem key={article.id} article={article} />
            ))}
          </div>
          <PaginationLinks
            page={result.page}
            totalPages={result.totalPages}
            createHref={(targetPage) =>
              `/ingestion/fetched?startedAt=${encodeURIComponent(startedAt.toISOString())}&finishedAt=${encodeURIComponent(finishedAt.toISOString())}&page=${targetPage}`
            }
          />
        </section>
      )}
    </div>
  );
}
