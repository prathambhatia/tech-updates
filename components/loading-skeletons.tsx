function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-md bg-ink-200/80 dark:bg-slate-700/70 ${className}`} aria-hidden="true" />;
}

export function ArticleListItemSkeleton() {
  return (
    <article className="rounded-2xl border border-ink-200 bg-gradient-to-r from-white to-ink-50 p-6 shadow-sm dark:border-slate-800 dark:bg-[linear-gradient(140deg,rgba(15,23,42,0.92)_0%,rgba(15,23,42,0.75)_45%,rgba(17,94,89,0.18)_100%)]">
      <div className="flex items-center justify-between gap-3">
        <SkeletonBlock className="h-3 w-48" />
        <SkeletonBlock className="h-6 w-24 rounded-full" />
      </div>
      <SkeletonBlock className="mt-4 h-8 w-11/12" />
      <SkeletonBlock className="mt-2 h-8 w-9/12" />
      <SkeletonBlock className="mt-4 h-3 w-full" />
      <SkeletonBlock className="mt-2 h-3 w-10/12" />
      <div className="mt-5 flex gap-2">
        <SkeletonBlock className="h-5 w-20 rounded-full" />
        <SkeletonBlock className="h-5 w-16 rounded-full" />
        <SkeletonBlock className="h-5 w-24 rounded-full" />
      </div>
    </article>
  );
}

export function CategoryCardSkeleton() {
  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
      <SkeletonBlock className="h-3 w-20" />
      <SkeletonBlock className="mt-3 h-7 w-9/12" />
      <SkeletonBlock className="mt-4 h-4 w-24" />
    </div>
  );
}

export function PagePanelSkeleton() {
  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/70">
      <SkeletonBlock className="h-4 w-32" />
      <SkeletonBlock className="mt-4 h-9 w-64" />
      <SkeletonBlock className="mt-3 h-4 w-full" />
      <SkeletonBlock className="mt-2 h-4 w-9/12" />
    </div>
  );
}
