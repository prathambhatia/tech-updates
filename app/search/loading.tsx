import { ArticleListItemSkeleton, PagePanelSkeleton } from "@/components/loading-skeletons";

export default function Loading() {
  return (
    <div className="space-y-6">
      <PagePanelSkeleton />
      <div className="space-y-4">
        <div className="h-4 w-44 animate-pulse rounded-md bg-ink-200/80 dark:bg-slate-700/70" />
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <ArticleListItemSkeleton key={`search-skeleton-${index}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
