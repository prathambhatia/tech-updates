import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-ink-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900/70">
      <h1 className="font-display text-4xl font-semibold text-ink-900 dark:text-slate-100">Not Found</h1>
      <p className="mt-3 text-ink-600 dark:text-slate-300">The page or article you requested is not available.</p>
      <Link
        href="/"
        className="mt-6 inline-flex rounded-lg border border-accent-600 bg-accent-600 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-500 dark:border-teal-300 dark:bg-teal-500 dark:text-slate-900 dark:hover:bg-teal-400"
      >
        Back to homepage
      </Link>
    </div>
  );
}
