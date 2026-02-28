import type { Metadata } from "next";
import Link from "next/link";
import { Playfair_Display, Source_Sans_3 } from "next/font/google";

import { IngestionControls } from "@/components/ingestion-controls";
import { env } from "@/lib/env";
import { ThemeToggle } from "@/components/theme-toggle";
import { ensureIngestionScheduler } from "@/lib/scheduler";
import "@/app/globals.css";

const displayFont = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap"
});

const bodyFont = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Tech Updates at one place.",
  description: "Categorized AI + system design blog aggregation platform"
};

if (process.env.NODE_ENV !== "test") {
  ensureIngestionScheduler();
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${displayFont.variable} ${bodyFont.variable}`}>
      <body className="font-body">
        <div className="min-h-screen bg-editorial dark:bg-[radial-gradient(circle_at_20%_0%,rgba(20,141,131,0.15),transparent_30%),radial-gradient(circle_at_80%_10%,rgba(59,130,246,0.12),transparent_35%),linear-gradient(180deg,#0f1417_0%,#111a1f_100%)]">
          <header className="sticky top-0 z-30 border-b border-ink-200/70 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-[#11181d]/85">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
              <div>
                <Link href="/" className="font-display text-2xl font-bold tracking-tight text-ink-900 dark:text-slate-100">
                  AI Systems Intelligence
                </Link>
                <p className="text-sm text-ink-600 dark:text-slate-400">AI + system design aggregation</p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href="/"
                  className="rounded-full border border-ink-300 px-3 py-1 text-sm font-medium text-ink-700 hover:border-accent-600 hover:text-accent-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:border-teal-300 dark:hover:text-teal-200"
                >
                  Home
                </Link>
                <Link
                  href="/#categories"
                  className="rounded-full border border-ink-300 px-3 py-1 text-sm font-medium text-ink-700 hover:border-accent-600 hover:text-accent-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:border-teal-300 dark:hover:text-teal-200"
                >
                  Categories
                </Link>
                <Link
                  href="/search"
                  className="rounded-full border border-ink-300 px-3 py-1 text-sm font-medium text-ink-700 hover:border-accent-600 hover:text-accent-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:border-teal-300 dark:hover:text-teal-200"
                >
                  Search
                </Link>
                {env.INGESTION_MANUAL_TRIGGER_ENABLED ? <IngestionControls /> : null}
                <ThemeToggle />
              </div>
            </div>
          </header>
          <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
