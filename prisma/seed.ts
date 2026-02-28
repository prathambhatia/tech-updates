import "dotenv/config";

import { PrismaClient } from "@prisma/client";
import type { CategorySeed, SourceSeed } from "@/prisma/seed.types";

const prisma = new PrismaClient();

const categories: CategorySeed[] = [
  { name: "Frontier AI & Agents", slug: "frontier-ai-agents" },
  { name: "AI Tooling & Infra", slug: "ai-tooling-infra" },
  { name: "Big Tech Architecture", slug: "big-tech-architecture" },
  { name: "Popular Medium Engineering", slug: "popular-medium-engineering" }
];

const sources: SourceSeed[] = [
  {
    name: "OpenAI",
    url: "https://openai.com/blog",
    rssUrl: "https://openai.com/blog/rss.xml",
    categorySlug: "frontier-ai-agents"
  },
  {
    name: "Anthropic",
    url: "https://www.anthropic.com/research",
    rssUrl: "https://www.anthropic.com/research/rss.xml",
    categorySlug: "frontier-ai-agents"
  },
  {
    name: "Cognition",
    url: "https://cognition.ai/blog",
    rssUrl: "https://cognition.ai/blog/rss.xml",
    categorySlug: "frontier-ai-agents"
  },
  {
    name: "HuggingFace",
    url: "https://huggingface.co/blog",
    rssUrl: "https://huggingface.co/blog/feed.xml",
    categorySlug: "frontier-ai-agents"
  },
  {
    name: "Google DeepMind Blog",
    url: "https://deepmind.google/discover/blog",
    rssUrl: "https://deepmind.google/discover/blog/rss.xml",
    categorySlug: "frontier-ai-agents"
  },
  {
    name: "Cloudflare",
    url: "https://blog.cloudflare.com/",
    rssUrl: "https://blog.cloudflare.com/rss/",
    categorySlug: "ai-tooling-infra"
  },
  {
    name: "LangChain",
    url: "https://blog.langchain.dev/",
    rssUrl: "https://blog.langchain.dev/rss/",
    categorySlug: "ai-tooling-infra"
  },
  {
    name: "Vercel AI",
    url: "https://vercel.com/blog/tag/ai",
    rssUrl: "https://vercel.com/atom.xml?path=/blog/tag/ai",
    categorySlug: "ai-tooling-infra"
  },
  {
    name: "Netflix Tech Blog",
    url: "https://netflixtechblog.com/",
    rssUrl: "https://netflixtechblog.com/feed",
    categorySlug: "big-tech-architecture"
  },
  {
    name: "Uber Engineering",
    url: "https://www.uber.com/blog/engineering/",
    rssUrl: "https://www.uber.com/blog/engineering/rss/",
    categorySlug: "big-tech-architecture"
  },
  {
    name: "Stripe Engineering",
    url: "https://stripe.com/blog/engineering",
    rssUrl: "https://stripe.com/blog/engineering/feed",
    categorySlug: "big-tech-architecture"
  },
  {
    name: "Dropbox Tech",
    url: "https://dropbox.tech/",
    rssUrl: "https://dropbox.tech/feed",
    categorySlug: "big-tech-architecture"
  },
  {
    name: "Meta Engineering",
    url: "https://engineering.fb.com/",
    rssUrl: "https://engineering.fb.com/feed/",
    categorySlug: "big-tech-architecture"
  },
  {
    name: "Google Cloud Blog",
    url: "https://cloud.google.com/blog",
    rssUrl: "https://cloud.google.com/blog/rss/",
    categorySlug: "big-tech-architecture"
  },
  {
    name: "AWS Architecture",
    url: "https://aws.amazon.com/blogs/architecture/",
    rssUrl: "https://aws.amazon.com/blogs/architecture/feed/",
    categorySlug: "big-tech-architecture"
  },
  {
    name: "Medium: System Design",
    url: "https://medium.com/tag/system-design",
    rssUrl: "https://medium.com/feed/tag/system-design",
    categorySlug: "popular-medium-engineering"
  },
  {
    name: "Medium: Distributed Systems",
    url: "https://medium.com/tag/distributed-systems",
    rssUrl: "https://medium.com/feed/tag/distributed-systems",
    categorySlug: "popular-medium-engineering"
  },
  {
    name: "Medium: LLM",
    url: "https://medium.com/tag/llm",
    rssUrl: "https://medium.com/feed/tag/llm",
    categorySlug: "popular-medium-engineering"
  },
  {
    name: "Medium: Transformers",
    url: "https://medium.com/tag/transformers",
    rssUrl: "https://medium.com/feed/tag/transformers",
    categorySlug: "popular-medium-engineering"
  },
  {
    name: "Medium: RAG",
    url: "https://medium.com/tag/rag",
    rssUrl: "https://medium.com/feed/tag/rag",
    categorySlug: "popular-medium-engineering"
  },
  {
    name: "Medium: Scaling",
    url: "https://medium.com/tag/scaling",
    rssUrl: "https://medium.com/feed/tag/scaling",
    categorySlug: "popular-medium-engineering"
  }
];

async function main() {
  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      create: category,
      update: {
        name: category.name
      }
    });
  }

  const allCategories = await prisma.category.findMany({
    select: { id: true, slug: true }
  });
  const categoryBySlug = new Map(allCategories.map((category) => [category.slug, category.id]));

  for (const source of sources) {
    const categoryId = categoryBySlug.get(source.categorySlug);

    if (!categoryId) {
      throw new Error(`Missing category: ${source.categorySlug}`);
    }

    await prisma.source.upsert({
      where: { name: source.name },
      create: {
        name: source.name,
        url: source.url,
        rssUrl: source.rssUrl,
        categoryId
      },
      update: {
        url: source.url,
        rssUrl: source.rssUrl,
        categoryId
      }
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
