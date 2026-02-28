import Link from "next/link";

import type { CategoryCardProps } from "@/types/components/category-card.types";

export function CategoryCard({ category }: CategoryCardProps) {
  return (
    <Link
      href={`/category/${category.slug}`}
      className="group rounded-2xl border border-ink-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-accent-500 hover:shadow-paper dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-[0_14px_32px_rgba(2,8,23,0.42)]"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-500 dark:text-slate-400">Category</p>
      <h3 className="mt-2 text-xl font-semibold leading-tight text-ink-900 group-hover:text-accent-600 dark:text-slate-100 dark:group-hover:text-teal-200">
        {category.name}
      </h3>
      <p className="mt-3 text-sm text-ink-600 dark:text-slate-300">{category.articleCount} articles</p>
    </Link>
  );
}
