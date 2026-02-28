import Link from "next/link";
import { notFound } from "next/navigation";

import type { ArticlePageProps } from "@/types/app/article-page.types";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { getBySlug } from "@/services/article.service";
import { formatDate } from "@/utils/date";

export default async function ArticlePage({ params }: ArticlePageProps) {
  const article = await getBySlug(params.slug);

  if (!article) {
    notFound();
  }

  return (
    <article className="mx-auto max-w-3xl rounded-2xl border border-ink-200 bg-white px-6 py-10 shadow-sm dark:border-slate-800 dark:bg-slate-900/75 dark:shadow-[0_20px_45px_rgba(2,8,23,0.5)] sm:px-10">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: article.categoryName, href: `/category/${article.categorySlug}` },
            { label: "Article" }
          ]}
        />
        <Link
          href={`/category/${article.categorySlug}`}
          className="text-sm font-semibold text-ink-700 hover:text-accent-600 dark:text-slate-200 dark:hover:text-teal-200"
        >
          Back to Category
        </Link>
      </div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-500 dark:text-slate-400">
        {article.sourceName} • {article.categoryName}
      </p>

      <h1 className="mt-4 font-display text-4xl font-semibold leading-tight text-ink-900 dark:text-slate-100 sm:text-5xl">
        {article.title}
      </h1>

      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-500 dark:text-slate-400">
        <span>{formatDate(article.publishedAt)}</span>
        <span>{article.readingTime} min read</span>
        {article.author ? <span>by {article.author}</span> : null}
      </div>

      {article.tags.length > 0 ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {article.tags.map((tag) => (
            <span
              key={`${article.id}-${tag}`}
              className="rounded-full border border-ink-200 px-2.5 py-1 text-xs font-medium text-ink-600 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-300"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      <div className="prose prose-lg mt-8 max-w-none prose-headings:font-display prose-p:text-ink-700 dark:prose-invert dark:prose-headings:text-slate-100 dark:prose-p:text-slate-300 dark:prose-strong:text-slate-100 dark:prose-a:text-teal-200">
        {article.summary ? <p>{article.summary}</p> : null}
        {article.contentPreview ? <p>{article.contentPreview}</p> : <p>No content preview available.</p>}
      </div>

      <div className="mt-8 border-t border-ink-200 pt-6 dark:border-slate-800">
        <a href={article.url} target="_blank" rel="noreferrer" className="text-sm font-semibold dark:text-teal-200 dark:hover:text-teal-100">
          Read original article
        </a>
      </div>
    </article>
  );
}
