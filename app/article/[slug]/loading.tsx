export default function Loading() {
  return (
    <article className="mx-auto max-w-3xl rounded-2xl border border-ink-200 bg-white px-6 py-10 shadow-sm dark:border-slate-800 dark:bg-slate-900/75 sm:px-10">
      <div className="h-4 w-48 animate-pulse rounded-md bg-ink-200/80 dark:bg-slate-700/70" />
      <div className="mt-5 h-12 w-11/12 animate-pulse rounded-md bg-ink-200/80 dark:bg-slate-700/70" />
      <div className="mt-2 h-12 w-8/12 animate-pulse rounded-md bg-ink-200/80 dark:bg-slate-700/70" />
      <div className="mt-5 h-4 w-64 animate-pulse rounded-md bg-ink-200/80 dark:bg-slate-700/70" />

      <div className="mt-6 flex gap-2">
        <div className="h-6 w-20 animate-pulse rounded-full bg-ink-200/80 dark:bg-slate-700/70" />
        <div className="h-6 w-24 animate-pulse rounded-full bg-ink-200/80 dark:bg-slate-700/70" />
        <div className="h-6 w-16 animate-pulse rounded-full bg-ink-200/80 dark:bg-slate-700/70" />
      </div>

      <div className="mt-8 space-y-3">
        {Array.from({ length: 7 }).map((_, index) => (
          <div
            key={`article-line-${index}`}
            className={`h-4 animate-pulse rounded-md bg-ink-200/80 dark:bg-slate-700/70 ${index % 3 === 2 ? "w-8/12" : "w-full"}`}
          />
        ))}
      </div>
    </article>
  );
}
