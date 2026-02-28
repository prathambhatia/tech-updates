import { ArticleListItemSkeleton, CategoryCardSkeleton } from "@/components/loading-skeletons";

export default function Loading() {
  return (
    <div className="space-y-12">
      <section>
        <div className="h-12 w-10/12 animate-pulse rounded-md bg-ink-200/80 dark:bg-slate-700/70" />
        <div className="mt-4 h-5 w-11/12 animate-pulse rounded-md bg-ink-200/80 dark:bg-slate-700/70" />
      </section>

      <section className="space-y-4">
        <div className="h-10 w-48 animate-pulse rounded-md bg-ink-200/80 dark:bg-slate-700/70" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <CategoryCardSkeleton key={`cat-skeleton-${index}`} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="h-10 w-52 animate-pulse rounded-md bg-ink-200/80 dark:bg-slate-700/70" />
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <ArticleListItemSkeleton key={`article-skeleton-${index}`} />
          ))}
        </div>
      </section>
    </div>
  );
}
