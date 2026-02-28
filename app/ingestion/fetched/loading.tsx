import { ArticleListItemSkeleton, PagePanelSkeleton } from "@/components/loading-skeletons";

export default function Loading() {
  return (
    <div className="space-y-6">
      <PagePanelSkeleton />
      <div className="grid gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <ArticleListItemSkeleton key={`fetched-loading-${index}`} />
        ))}
      </div>
    </div>
  );
}
