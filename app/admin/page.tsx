import type { AdminPageProps } from "@/app/admin/page.types";
import {
  getAdminCookieName,
  getAdminSessionFromCookies,
  isAdminConfigured,
  isAdminSessionValid
} from "@/admin/auth";
import { getAdminIngestionReport } from "@/admin/services/report.service";

export const dynamic = "force-dynamic";

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short"
  }).format(date);
}

function formatDateOnly(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit"
  }).format(date);
}

function renderLogin(error?: string) {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-ink-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/75">
      <h1 className="font-display text-3xl font-semibold text-ink-900 dark:text-slate-100">Admin Login</h1>
      <p className="mt-2 text-sm text-ink-600 dark:text-slate-300">Use your admin ID and password to view ingestion reports.</p>
      {error === "invalid" ? <p className="mt-4 text-sm font-medium text-red-600">Invalid ID or password.</p> : null}
      {error === "config" ? (
        <p className="mt-4 text-sm font-medium text-red-600">Admin login is not configured on this deployment.</p>
      ) : null}

      <form action="/admin/login" method="post" className="mt-5 space-y-4">
        <div>
          <label htmlFor="admin-id" className="block text-sm font-medium text-ink-800 dark:text-slate-200">
            ID
          </label>
          <input
            id="admin-id"
            name="id"
            type="text"
            required
            className="mt-1 w-full rounded-lg border border-ink-300 px-3 py-2 text-sm text-ink-900 focus:border-accent-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100"
          />
        </div>

        <div>
          <label htmlFor="admin-password" className="block text-sm font-medium text-ink-800 dark:text-slate-200">
            Password
          </label>
          <input
            id="admin-password"
            name="password"
            type="password"
            required
            className="mt-1 w-full rounded-lg border border-ink-300 px-3 py-2 text-sm text-ink-900 focus:border-accent-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-100"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-accent-600 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-700"
        >
          Sign In
        </button>
      </form>
    </div>
  );
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  if (!isAdminConfigured()) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-amber-300 bg-amber-50 p-6 dark:border-amber-700/60 dark:bg-amber-900/10">
        <h1 className="font-display text-3xl font-semibold text-ink-900 dark:text-slate-100">Admin Not Configured</h1>
        <p className="mt-3 text-sm text-ink-700 dark:text-slate-300">
          Set these production env vars and redeploy: <code>ADMIN_ID</code>, <code>ADMIN_PASSWORD</code>, <code>ADMIN_SESSION_SECRET</code>.
        </p>
      </div>
    );
  }

  const isAuthenticated = isAdminSessionValid(getAdminSessionFromCookies());
  if (!isAuthenticated) {
    return renderLogin(searchParams.error);
  }

  const report = await getAdminIngestionReport({ days: 14, recentLimit: 120 });

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-ink-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/75">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-semibold text-ink-900 dark:text-slate-100">Ingestion Admin Report</h1>
            <p className="mt-2 text-sm text-ink-600 dark:text-slate-300">Generated at {formatDateTime(report.generatedAt)}</p>
          </div>
          <form action="/admin/logout" method="post">
            <button
              type="submit"
              className="rounded-lg border border-ink-300 px-3 py-2 text-sm font-semibold text-ink-800 hover:border-accent-600 hover:text-accent-600 dark:border-slate-700 dark:text-slate-200 dark:hover:border-teal-300 dark:hover:text-teal-200"
            >
              Logout
            </button>
          </form>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-ink-200 p-4 dark:border-slate-700">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-500 dark:text-slate-400">Window</p>
            <p className="mt-2 text-2xl font-semibold text-ink-900 dark:text-slate-100">Last {report.periodDays} Days</p>
          </div>
          <div className="rounded-xl border border-ink-200 p-4 dark:border-slate-700">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-500 dark:text-slate-400">New Blogs Added</p>
            <p className="mt-2 text-2xl font-semibold text-ink-900 dark:text-slate-100">{report.totalNewBlogs}</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-ink-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/75">
        <h2 className="font-display text-2xl font-semibold text-ink-900 dark:text-slate-100">Daily Fetch Counts (24h buckets)</h2>
        <p className="mt-2 text-sm text-ink-600 dark:text-slate-300">Each row represents one 24-hour UTC bucket.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ink-200 dark:border-slate-700">
                <th className="px-2 py-2 font-semibold text-ink-700 dark:text-slate-200">Date (UTC)</th>
                <th className="px-2 py-2 font-semibold text-ink-700 dark:text-slate-200">Window</th>
                <th className="px-2 py-2 font-semibold text-ink-700 dark:text-slate-200">New Blogs</th>
              </tr>
            </thead>
            <tbody>
              {report.dayBuckets.map((bucket) => (
                <tr key={bucket.date} className="border-b border-ink-100 dark:border-slate-800">
                  <td className="px-2 py-2 text-ink-800 dark:text-slate-200">{bucket.date}</td>
                  <td className="px-2 py-2 text-ink-600 dark:text-slate-300">
                    {formatDateOnly(bucket.windowStart)} - {formatDateOnly(bucket.windowEnd)}
                  </td>
                  <td className="px-2 py-2 font-semibold text-ink-900 dark:text-slate-100">{bucket.newBlogsCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-ink-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/75">
        <h2 className="font-display text-2xl font-semibold text-ink-900 dark:text-slate-100">Recently Fetched Blogs</h2>
        <p className="mt-2 text-sm text-ink-600 dark:text-slate-300">Latest blogs created by ingestion in the same report window.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ink-200 dark:border-slate-700">
                <th className="px-2 py-2 font-semibold text-ink-700 dark:text-slate-200">Fetched At</th>
                <th className="px-2 py-2 font-semibold text-ink-700 dark:text-slate-200">Category</th>
                <th className="px-2 py-2 font-semibold text-ink-700 dark:text-slate-200">Source</th>
                <th className="px-2 py-2 font-semibold text-ink-700 dark:text-slate-200">Title</th>
              </tr>
            </thead>
            <tbody>
              {report.recentFetchedArticles.map((article) => (
                <tr key={article.id} className="border-b border-ink-100 dark:border-slate-800">
                  <td className="px-2 py-2 whitespace-nowrap text-ink-600 dark:text-slate-300">{formatDateTime(article.createdAt)}</td>
                  <td className="px-2 py-2 text-ink-800 dark:text-slate-200">{article.categoryName}</td>
                  <td className="px-2 py-2 text-ink-800 dark:text-slate-200">{article.sourceName}</td>
                  <td className="px-2 py-2">
                    <a href={`/article/${article.slug}`} className="text-ink-900 hover:text-accent-600 dark:text-slate-100 dark:hover:text-teal-200">
                      {article.title}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-xs text-ink-500 dark:text-slate-400">
        Cookie: <code>{getAdminCookieName()}</code> (HttpOnly, 12h). This admin panel is server-rendered.
      </p>
    </div>
  );
}
