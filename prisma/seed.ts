import "dotenv/config";

import { PrismaClient } from "@prisma/client";
import type { CategorySeed, SourceSeed } from "@/types/prisma/seed.types";

const prisma = new PrismaClient();

const categories: CategorySeed[] = [
  { name: "ML, AI & Agents", slug: "ml-ai-agents" },
  { name: "Big Tech Architecture", slug: "big-tech-architecture" },
  { name: "Big Tech Outages", slug: "big-tech-outages" },
  { name: "Popular Medium Engineering", slug: "popular-medium-engineering" }
];

const sources: SourceSeed[] = [
  {
    name: "OpenAI",
    url: "https://openai.com/blog",
    rssUrl: "https://openai.com/blog/rss.xml",
    categorySlug: "ml-ai-agents"
  },
  {
    name: "Anthropic",
    url: "https://www.anthropic.com/research",
    rssUrl: "https://www.anthropic.com/research/rss.xml",
    categorySlug: "ml-ai-agents"
  },
  {
    name: "Cognition",
    url: "https://cognition.ai/blog",
    rssUrl: "https://cognition.ai/blog/rss.xml",
    categorySlug: "ml-ai-agents"
  },
  {
    name: "HuggingFace",
    url: "https://huggingface.co/blog",
    rssUrl: "https://huggingface.co/blog/feed.xml",
    categorySlug: "ml-ai-agents"
  },
  {
    name: "Google DeepMind Blog",
    url: "https://deepmind.google/discover/blog",
    rssUrl: "https://deepmind.google/discover/blog/rss.xml",
    categorySlug: "ml-ai-agents"
  },
  {
    name: "Cloudflare",
    url: "https://blog.cloudflare.com/",
    rssUrl: "https://blog.cloudflare.com/rss/",
    categorySlug: "big-tech-architecture"
  },
  {
    name: "LangChain",
    url: "https://blog.langchain.dev/",
    rssUrl: "https://blog.langchain.dev/rss/",
    categorySlug: "ml-ai-agents"
  },
  {
    name: "Vercel AI",
    url: "https://vercel.com/blog/tag/ai",
    rssUrl: "https://vercel.com/atom.xml?path=/blog/tag/ai",
    categorySlug: "ml-ai-agents"
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
    name: "Slack Engineering",
    url: "https://slack.engineering/",
    rssUrl: "https://slack.engineering/feed/",
    categorySlug: "big-tech-architecture"
  },
  {
    name: "Lyft Engineering",
    url: "https://eng.lyft.com/",
    rssUrl: "https://eng.lyft.com/feed",
    categorySlug: "big-tech-architecture"
  },
  {
    name: "GitHub Engineering",
    url: "https://github.blog/engineering/",
    rssUrl: "https://github.blog/engineering/feed/",
    categorySlug: "big-tech-architecture"
  },
  {
    name: "Datadog Engineering",
    url: "https://www.datadoghq.com/blog/engineering/",
    rssUrl: "https://www.datadoghq.com/blog/engineering/index.xml",
    categorySlug: "big-tech-architecture"
  },
  {
    name: "LinkedIn Engineering",
    url: "https://engineering.linkedin.com/blog",
    rssUrl: "https://engineering.linkedin.com/blog/rss",
    categorySlug: "big-tech-architecture"
  },
  {
    name: "Spotify Engineering",
    url: "https://engineering.atspotify.com/",
    rssUrl: "https://engineering.atspotify.com/feed/",
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

  for (const legacySlug of ["frontier-ai-agents", "ai-tooling-infra"]) {
    const legacy = await prisma.category.findUnique({
      where: { slug: legacySlug },
      select: { id: true }
    });

    if (!legacy) {
      continue;
    }

    const sourceCount = await prisma.source.count({
      where: {
        categoryId: legacy.id
      }
    });

    if (sourceCount === 0) {
      await prisma.category.delete({
        where: {
          id: legacy.id
        }
      });
    }
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
