import Link from "next/link";

import type { ArticleCard } from "@/types/article";
import { formatDate } from "@/utils/date";

type ArticleListItemProps = {
  article: ArticleCard;
};

function truncateAtWordBoundary(input: string, maxLength: number): string {
  if (input.length <= maxLength) {
    return input;
  }

  const slice = input.slice(0, maxLength);
  const lastSpace = slice.lastIndexOf(" ");

  if (lastSpace < 0) {
    return `${slice}...`;
  }

  return `${slice.slice(0, lastSpace)}...`;
}

export function ArticleListItem({ article }: ArticleListItemProps) {
  const compactTitle = truncateAtWordBoundary(article.title, 140);
  const compactSummary = truncateAtWordBoundary(
    article.summary || article.contentPreview || "No summary available.",
    260
  );
  const popularityLabel = Number.isFinite(article.popularityScore) ? article.popularityScore.toFixed(1) : "0.0";

  return (
    <article className="rounded-2xl border border-ink-200 bg-gradient-to-r from-white to-ink-50 p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-paper dark:border-slate-800 dark:bg-[linear-gradient(140deg,rgba(15,23,42,0.92)_0%,rgba(15,23,42,0.75)_45%,rgba(17,94,89,0.18)_100%)] dark:shadow-[0_14px_34px_rgba(2,8,23,0.45)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-500 dark:text-slate-400">
          {article.sourceName} • {article.categoryName}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-accent-600/30 bg-accent-600/10 px-2.5 py-1 text-xs font-semibold text-accent-600 dark:border-teal-300/35 dark:bg-teal-300/10 dark:text-teal-200">
            Popularity {popularityLabel}
          </span>
          {article.viralVelocityScore >= 40 ? (
            <span className="rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-2.5 py-1 text-xs font-semibold text-fuchsia-700 dark:border-fuchsia-300/35 dark:bg-fuchsia-300/10 dark:text-fuchsia-200">
              Viral
            </span>
          ) : null}
          {article.breakthroughScore >= 28 ? (
            <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-xs font-semibold text-sky-700 dark:border-sky-300/35 dark:bg-sky-300/10 dark:text-sky-200">
              Breakthrough
            </span>
          ) : null}
          {article.importanceLevel === "must-read" ? (
            <span className="rounded-full border border-emerald-600/30 bg-emerald-600/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-300/35 dark:bg-emerald-300/10 dark:text-emerald-200">
              Must Read
            </span>
          ) : null}
        </div>
      </div>
      <h3 className="mt-2 text-2xl font-semibold leading-tight text-ink-900 dark:text-slate-100">
        <Link href={`/article/${article.slug}`} className="hover:text-accent-600 dark:hover:text-teal-200">
          {compactTitle}
        </Link>
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-ink-700 dark:text-slate-300">{compactSummary}</p>
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-500 dark:text-slate-400">
        <span>{formatDate(article.publishedAt)}</span>
        <span>{article.readingTime} min read</span>
        {article.author ? <span>by {article.author}</span> : null}
      </div>
      {article.tags.length > 0 || article.learningTracks.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {article.learningTracks.slice(0, 2).map((track) => (
            <span
              key={`${article.id}-${track}`}
              className="rounded-full border border-accent-600/30 bg-accent-600/10 px-2.5 py-1 text-xs font-semibold text-accent-700 dark:border-teal-300/35 dark:bg-teal-300/10 dark:text-teal-200"
            >
              {track}
            </span>
          ))}
          {article.tags.slice(0, 4).map((tag) => (
            <span
              key={`${article.id}-${tag}`}
              className="rounded-full border border-ink-200 px-2.5 py-1 text-xs font-medium text-ink-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  );
}
