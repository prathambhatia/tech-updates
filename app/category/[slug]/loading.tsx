import { ArticleListItemSkeleton, PagePanelSkeleton } from "@/components/loading-skeletons";

export default function Loading() {
  return (
    <div className="space-y-6">
      <PagePanelSkeleton />
      <div className="grid gap-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <ArticleListItemSkeleton key={`category-loading-${index}`} />
        ))}
      </div>
    </div>
  );
}
