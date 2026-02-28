import Link from "next/link";
import type { Route } from "next";
import type { PaginationLinksProps } from "@/types/components/pagination-links.types";

export function PaginationLinks({ page, totalPages, createHref }: PaginationLinksProps) {
  const previousPage = page - 1;
  const nextPage = page + 1;

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-ink-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900/70">
      {page > 1 ? (
        <Link
          href={createHref(previousPage) as Route}
          className="rounded-lg border border-ink-300 px-3 py-1.5 text-sm font-medium text-ink-700 hover:border-accent-600 hover:text-accent-600 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-200 dark:hover:border-teal-300 dark:hover:text-teal-200"
        >
          Previous
        </Link>
      ) : (
        <span className="rounded-lg border border-ink-200 px-3 py-1.5 text-sm text-ink-400 dark:border-slate-800 dark:text-slate-600">
          Previous
        </span>
      )}

      <p className="text-sm text-ink-600 dark:text-slate-300">
        Page {page} of {totalPages}
      </p>

      {page < totalPages ? (
        <Link
          href={createHref(nextPage) as Route}
          className="rounded-lg border border-ink-300 px-3 py-1.5 text-sm font-medium text-ink-700 hover:border-accent-600 hover:text-accent-600 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-200 dark:hover:border-teal-300 dark:hover:text-teal-200"
        >
          Next
        </Link>
      ) : (
        <span className="rounded-lg border border-ink-200 px-3 py-1.5 text-sm text-ink-400 dark:border-slate-800 dark:text-slate-600">
          Next
        </span>
      )}
    </div>
  );
}
