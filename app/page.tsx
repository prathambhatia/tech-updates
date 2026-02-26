import { ArticleListItem } from "@/components/article-list-item";
import { CategoryCard } from "@/components/category-card";
import {
  getCategoryCards,
  getJuniorMustReadArticles,
  getLatestArticles,
  getPopularArticles,
  getRolloutArticles
} from "@/services/article.service";

export default async function HomePage() {
  const [categories, mustReadArticles, popularArticles, rolloutArticles, latestArticles] = await Promise.all([
    getCategoryCards(),
    getJuniorMustReadArticles(8),
    getPopularArticles(8),
    getRolloutArticles(8),
    getLatestArticles(10)
  ]);

  return (
    <div className="space-y-12">
      <section>
        <h1 className="font-display text-4xl font-semibold leading-tight text-ink-900 dark:text-ink-100 sm:text-5xl">
          Stay current as a junior engineer
        </h1>
        <p className="mt-4 max-w-3xl text-lg text-ink-700 dark:text-ink-200">
          Read the most important updates in AI, LLMs, system design, and modern engineering architecture from trusted
          sources.
        </p>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-3xl font-semibold text-ink-900 dark:text-ink-100">Categories</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {categories.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-3xl font-semibold text-ink-900 dark:text-ink-100">Junior Must-Read</h2>
        <div className="grid gap-4">
          {mustReadArticles.map((article) => (
            <ArticleListItem key={article.id} article={article} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-3xl font-semibold text-ink-900 dark:text-ink-100">Popular Right Now</h2>
        <div className="grid gap-4">
          {popularArticles.map((article) => (
            <ArticleListItem key={article.id} article={article} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-3xl font-semibold text-ink-900 dark:text-ink-100">New Tech Rollouts</h2>
        <div className="grid gap-4">
          {rolloutArticles.map((article) => (
            <ArticleListItem key={article.id} article={article} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-3xl font-semibold text-ink-900 dark:text-ink-100">Latest Articles</h2>
        <div className="grid gap-4">
          {latestArticles.map((article) => (
            <ArticleListItem key={article.id} article={article} />
          ))}
        </div>
      </section>
    </div>
  );
}
