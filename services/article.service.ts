import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import type { ArticleCard, ArticleDetail, CategoryCard, SortDirection } from "@/types/article";
import { countWords, estimateReadingTime } from "@/utils/text";

const CATEGORY_PAGE_SIZE = 12;
const SEARCH_PAGE_SIZE = 12;
const INGESTION_PAGE_SIZE = 12;
const CANDIDATE_MULTIPLIER = 4;

const SOURCE_POPULARITY_WEIGHTS: Record<string, number> = {
  OpenAI: 22,
  Anthropic: 21,
  Cognition: 19,
  HuggingFace: 18,
  "Google DeepMind Blog": 19,
  Cloudflare: 17,
  LangChain: 16,
  "Vercel AI": 16,
  "Netflix Tech Blog": 16,
  "Uber Engineering": 15,
  "Meta Engineering": 15,
  "AWS Architecture": 15,
  "Google Cloud Blog": 15,
  "Stripe Engineering": 15,
  "Dropbox Tech": 14
};

type KeywordRule = {
  label?: string;
  boost: number;
  keywords: string[];
};

const TRACK_RULES: KeywordRule[] = [
  {
    label: "System Design",
    boost: 20,
    keywords: [
      "system design",
      "architecture",
      "distributed",
      "scaling",
      "latency",
      "throughput",
      "fault tolerance",
      "database",
      "queue",
      "event driven",
      "consensus",
      "replication"
    ]
  },
  {
    label: "AI & LLM",
    boost: 20,
    keywords: [
      "llm",
      "transformer",
      "rag",
      "agent",
      "inference",
      "prompt",
      "model",
      "eval",
      "fine-tuning",
      "embedding",
      "reasoning",
      "context window"
    ]
  },
  {
    label: "Infra & Platforms",
    boost: 16,
    keywords: [
      "kubernetes",
      "cloud",
      "platform",
      "deployment",
      "observability",
      "incident",
      "sre",
      "devops",
      "multi-tenant",
      "availability"
    ]
  },
  {
    label: "New Tech Rollout",
    boost: 16,
    keywords: [
      "introducing",
      "launch",
      "announcing",
      "released",
      "rollout",
      "new feature",
      "new model",
      "research preview",
      "general availability"
    ]
  }
];

const HOT_TOPIC_RULES: KeywordRule[] = [
  {
    boost: 16,
    keywords: ["reasoning model", "agentic", "mcp", "model context protocol", "ai coding", "copilot"]
  },
  {
    boost: 14,
    keywords: ["rag", "vector database", "inference", "gpu", "latency", "benchmark", "cost optimization"]
  },
  {
    boost: 12,
    keywords: ["distributed systems", "observability", "incident response", "platform engineering", "serverless"]
  }
];

const BREAKTHROUGH_RULES: KeywordRule[] = [
  {
    boost: 20,
    keywords: ["breakthrough", "state-of-the-art", "state of the art", "sota", "frontier model"]
  },
  {
    boost: 18,
    keywords: ["reasoning", "new model", "model release", "launch", "rollout", "announcing", "introducing"]
  },
  {
    boost: 14,
    keywords: ["benchmark", "paper", "open-source", "open source", "research", "test-time compute", "multimodal"]
  }
];

const LOW_SIGNAL_PATTERNS = ["support@", "press@", "download press kit", "copyright", "all rights reserved"];

type ArticleRecord = Prisma.ArticleGetPayload<{
  include: {
    source: {
      include: {
        category: true;
      };
    };
    tags: {
      include: {
        tag: true;
      };
    };
  };
}>;

function asFiniteNumber(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

function safeRound(value: number): number {
  const finite = asFiniteNumber(value, 0);
  return Number(finite.toFixed(2));
}

function normalizedContent(record: ArticleRecord): string {
  return [record.title, record.summary, record.contentPreview, ...record.tags.map((binding) => binding.tag.name)]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function scoreKeywordRules(content: string, rules: KeywordRule[]): { score: number; labels: string[] } {
  const labels: string[] = [];
  let score = 0;

  for (const rule of rules) {
    if (!rule.keywords.some((keyword) => content.includes(keyword))) {
      continue;
    }

    score += rule.boost;
    if (rule.label) {
      labels.push(rule.label);
    }
  }

  return {
    score,
    labels
  };
}

function computeLearningTracks(record: ArticleRecord): { tracks: string[]; keywordBoost: number } {
  const content = normalizedContent(record);
  const trackScore = scoreKeywordRules(content, TRACK_RULES);
  return {
    tracks: trackScore.labels,
    keywordBoost: trackScore.score
  };
}

function isLowSignalArticle(record: ArticleRecord): boolean {
  const content = normalizedContent(record);

  if (record.title.trim().length < 12) {
    return true;
  }

  return LOW_SIGNAL_PATTERNS.some((pattern) => content.includes(pattern));
}

function ageInDays(record: ArticleRecord): number {
  const publishedAtMs = record.publishedAt.getTime();
  if (!Number.isFinite(publishedAtMs)) {
    return 365;
  }

  return Math.max(0, Math.floor((Date.now() - publishedAtMs) / (1000 * 60 * 60 * 24)));
}

function effectiveReadingTime(record: ArticleRecord): number {
  const content = normalizedContent(record);
  const wordTotal = countWords(content);
  const estimated = estimateReadingTime(content, {
    wordsPerMinute: 170,
    minMinutes: wordTotal >= 30 ? 2 : 1
  });

  return Math.max(asFiniteNumber(record.readingTime, 1), asFiniteNumber(estimated, 1));
}

function readabilityScore(readingTime: number): number {
  const idealMidpoint = 10;
  const distance = Math.abs(readingTime - idealMidpoint);
  return Math.max(6, 18 - distance * 1.15);
}

function resolvedBreakthroughScore(record: ArticleRecord): number {
  const content = normalizedContent(record);
  const computed = scoreKeywordRules(content, BREAKTHROUGH_RULES).score;
  return Math.max(asFiniteNumber(record.breakthroughScore, 0), asFiniteNumber(computed, 0));
}

function resolvedHotTopicScore(record: ArticleRecord): number {
  const content = normalizedContent(record);
  const computed = scoreKeywordRules(content, HOT_TOPIC_RULES).score;
  return Math.max(asFiniteNumber(record.hotTopicScore, 0), asFiniteNumber(computed, 0));
}

function computeCompositePopularSignal(record: ArticleRecord): number {
  const externalSignal = Math.min(asFiniteNumber(record.externalPopularityScore, 0), 1100) / 12.5;
  const viralSignal = Math.min(asFiniteNumber(record.viralVelocityScore, 0), 260) / 3.8;
  const hotTopicSignal = resolvedHotTopicScore(record) * 0.58;
  return asFiniteNumber(externalSignal + viralSignal + hotTopicSignal, 0);
}

function computePopularityScore(record: ArticleRecord): number {
  const days = ageInDays(record);
  const readingTime = effectiveReadingTime(record);
  const recencyScore = (Math.max(0, 160 - days) / 160) * 34;
  const freshBoost = days <= 2 ? 18 : days <= 7 ? 12 : days <= 21 ? 6 : 0;
  const sourceScore = SOURCE_POPULARITY_WEIGHTS[record.source.name] ?? 10;
  const depthScore = Math.min(readingTime, 20) * 0.9;
  const breakthroughBoost = resolvedBreakthroughScore(record) * 0.36;
  const popularSignal = computeCompositePopularSignal(record);

  return safeRound(recencyScore + freshBoost + sourceScore + depthScore + breakthroughBoost + popularSignal);
}

function computeJuniorRelevanceScore(record: ArticleRecord): number {
  const days = ageInDays(record);
  const readingTime = effectiveReadingTime(record);
  const { keywordBoost } = computeLearningTracks(record);
  const hotTopicScore = resolvedHotTopicScore(record);
  const breakthroughScore = resolvedBreakthroughScore(record);

  const recency = (Math.max(0, 200 - days) / 200) * 36;
  const sourceTrust = SOURCE_POPULARITY_WEIGHTS[record.source.name] ?? 10;
  const readability = readabilityScore(readingTime);
  const tagSignal = Math.min(record.tags.length, 8) * 1.7;
  const externalSignalBoost = Math.min(asFiniteNumber(record.externalPopularityScore, 0), 900) / 22;
  const viralSignalBoost = Math.min(asFiniteNumber(record.viralVelocityScore, 0), 260) / 15;
  const hotTopicBoost = hotTopicScore * 0.35;
  const breakthroughBoost = breakthroughScore * 0.48;
  const lowSignalPenalty = isLowSignalArticle(record) ? 70 : 0;
  const overlongPenalty = readingTime > 30 ? 9 : 0;

  return safeRound(
    recency +
      sourceTrust +
      readability +
      tagSignal +
      keywordBoost +
      externalSignalBoost +
      viralSignalBoost +
      hotTopicBoost +
      breakthroughBoost -
      lowSignalPenalty -
      overlongPenalty
  );
}

function importanceLevel(score: number): "must-read" | "recommended" | "optional" {
  if (score >= 100) {
    return "must-read";
  }

  if (score >= 74) {
    return "recommended";
  }

  return "optional";
}

function sortRecords(records: ArticleRecord[], sort: SortDirection): ArticleRecord[] {
  const filtered = records.filter((record) => !isLowSignalArticle(record));

  if (sort === "latest") {
    return filtered.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
  }

  if (sort === "oldest") {
    return filtered.sort((a, b) => a.publishedAt.getTime() - b.publishedAt.getTime());
  }

  return filtered.sort((a, b) => {
    const compositeA = computeJuniorRelevanceScore(a) * 0.62 + computePopularityScore(a) * 0.38;
    const compositeB = computeJuniorRelevanceScore(b) * 0.62 + computePopularityScore(b) * 0.38;

    const compositeDiff = compositeB - compositeA;
    if (compositeDiff !== 0) {
      return compositeDiff;
    }

    const viralDiff = b.viralVelocityScore - a.viralVelocityScore;
    if (viralDiff !== 0) {
      return viralDiff;
    }

    return b.publishedAt.getTime() - a.publishedAt.getTime();
  });
}

function dbOrderBy(sort: SortDirection): Prisma.ArticleOrderByWithRelationInput[] {
  if (sort === "latest") {
    return [{ publishedAt: "desc" }];
  }

  if (sort === "oldest") {
    return [{ publishedAt: "asc" }];
  }

  return [
    { externalPopularityScore: "desc" },
    { viralVelocityScore: "desc" },
    { hotTopicScore: "desc" },
    { breakthroughScore: "desc" },
    { publishedAt: "desc" }
  ];
}

function mapArticle(record: ArticleRecord): ArticleCard {
  const tracks = computeLearningTracks(record).tracks;
  const juniorScore = asFiniteNumber(computeJuniorRelevanceScore(record), 0);
  const breakthroughScore = resolvedBreakthroughScore(record);
  const hotTopicScore = resolvedHotTopicScore(record);
  const readingTime = effectiveReadingTime(record);
  const popularityScore = asFiniteNumber(computePopularityScore(record), 0);

  return {
    id: record.id,
    title: record.title,
    slug: record.slug,
    summary: record.summary,
    contentPreview: record.contentPreview,
    author: record.author,
    publishedAt: record.publishedAt,
    readingTime,
    sourceName: record.source.name,
    categoryName: record.source.category.name,
    categorySlug: record.source.category.slug,
    tags: record.tags.map((binding) => binding.tag.name),
    popularityScore,
    juniorRelevanceScore: juniorScore,
    externalPopularityScore: asFiniteNumber(record.externalPopularityScore, 0),
    viralVelocityScore: asFiniteNumber(record.viralVelocityScore, 0),
    breakthroughScore,
    hotTopicScore,
    learningTracks: tracks,
    importanceLevel: importanceLevel(juniorScore)
  };
}

export async function getCategoryCards(): Promise<CategoryCard[]> {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: {
      sources: {
        include: {
          _count: {
            select: { articles: true }
          }
        }
      }
    }
  });

  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    articleCount: category.sources.reduce((total, source) => total + source._count.articles, 0)
  }));
}

async function fetchArticleRecords(params?: {
  where?: Prisma.ArticleWhereInput;
  orderBy?: Prisma.ArticleOrderByWithRelationInput[];
  skip?: number;
  take?: number;
}): Promise<ArticleRecord[]> {
  const { where, orderBy, skip, take } = params ?? {};

  return prisma.article.findMany({
    where,
    orderBy,
    skip,
    take,
    include: {
      source: {
        include: {
          category: true
        }
      },
      tags: {
        include: {
          tag: true
        }
      }
    }
  });
}

export async function getLatestArticles(limit = 10): Promise<ArticleCard[]> {
  const records = await fetchArticleRecords({
    where: {
      publishedAt: {
        gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 365)
      }
    },
    orderBy: dbOrderBy("latest"),
    take: Math.max(limit * CANDIDATE_MULTIPLIER, limit)
  });

  return records.filter((record) => !isLowSignalArticle(record)).slice(0, limit).map(mapArticle);
}

export async function getPopularArticles(limit = 10): Promise<ArticleCard[]> {
  const records = await fetchArticleRecords({
    where: {
      publishedAt: {
        gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 365)
      }
    },
    orderBy: dbOrderBy("popular"),
    take: Math.max(limit * CANDIDATE_MULTIPLIER, limit)
  });

  return records.filter((record) => !isLowSignalArticle(record)).slice(0, limit).map(mapArticle);
}

export async function getJuniorMustReadArticles(limit = 8): Promise<ArticleCard[]> {
  const records = await fetchArticleRecords({
    where: {
      publishedAt: {
        gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 240)
      }
    },
    orderBy: dbOrderBy("popular"),
    take: Math.max(limit * 50, 200)
  });

  return sortRecords(records, "popular")
    .filter((record) => computeJuniorRelevanceScore(record) >= 75)
    .slice(0, limit)
    .map(mapArticle);
}

export async function getRolloutArticles(limit = 8): Promise<ArticleCard[]> {
  const records = await fetchArticleRecords({
    where: {
      publishedAt: {
        gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 120)
      }
    },
    orderBy: dbOrderBy("latest"),
    take: Math.max(limit * 50, 200)
  });

  return sortRecords(records, "latest")
    .filter((record) => computeLearningTracks(record).tracks.includes("New Tech Rollout"))
    .slice(0, limit)
    .map(mapArticle);
}

export async function getCategoryBySlug(slug: string) {
  return prisma.category.findUnique({
    where: { slug }
  });
}

export async function getCategoryArticles(params: {
  categorySlug: string;
  page: number;
  sort: SortDirection;
}) {
  const { categorySlug, page, sort } = params;
  const safePage = Math.max(1, page);

  const where: Prisma.ArticleWhereInput = {
    source: {
      category: {
        slug: categorySlug
      }
    }
  };

  const [total, records] = await Promise.all([
    prisma.article.count({ where }),
    fetchArticleRecords({
      where,
      orderBy: dbOrderBy(sort),
      skip: (safePage - 1) * CATEGORY_PAGE_SIZE,
      take: CATEGORY_PAGE_SIZE
    })
  ]);

  return {
    items: records.map(mapArticle),
    page: safePage,
    pageSize: CATEGORY_PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / CATEGORY_PAGE_SIZE))
  };
}

export async function getArticleDetailBySlug(slug: string): Promise<ArticleDetail | null> {
  const records = await fetchArticleRecords({ where: { slug }, take: 1 });
  const record = records[0];

  if (!record) {
    return null;
  }

  return {
    ...mapArticle(record),
    url: record.url
  };
}

export async function searchArticles(params: {
  query: string;
  categorySlug?: string;
  page: number;
  sort?: SortDirection;
}) {
  const { query, categorySlug, page, sort = "popular" } = params;
  const normalizedQuery = query.trim();
  const safePage = Math.max(1, page);

  const where: Prisma.ArticleWhereInput = {
    ...(normalizedQuery
      ? {
          title: {
            contains: normalizedQuery,
            mode: "insensitive" as const
          }
        }
      : {}),
    ...(categorySlug && categorySlug !== "all"
      ? {
          source: {
            category: {
              slug: categorySlug
            }
          }
        }
      : {})
  };

  const [total, records] = await Promise.all([
    prisma.article.count({ where }),
    fetchArticleRecords({
      where,
      orderBy: dbOrderBy(sort),
      skip: (safePage - 1) * SEARCH_PAGE_SIZE,
      take: SEARCH_PAGE_SIZE
    })
  ]);

  return {
    items: records.map(mapArticle),
    total,
    totalPages: Math.max(1, Math.ceil(total / SEARCH_PAGE_SIZE)),
    page: safePage,
    pageSize: SEARCH_PAGE_SIZE
  };
}

export async function getFetchedArticlesByWindow(params: {
  startedAt: Date;
  finishedAt: Date;
  page: number;
}) {
  const { startedAt, finishedAt, page } = params;
  const safePage = Math.max(1, page);

  const where: Prisma.ArticleWhereInput = {
    createdAt: {
      gte: startedAt,
      lte: finishedAt
    }
  };

  const [total, records] = await Promise.all([
    prisma.article.count({ where }),
    fetchArticleRecords({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip: (safePage - 1) * INGESTION_PAGE_SIZE,
      take: INGESTION_PAGE_SIZE
    })
  ]);

  return {
    items: records.map(mapArticle),
    total,
    totalPages: Math.max(1, Math.ceil(total / INGESTION_PAGE_SIZE)),
    page: safePage,
    pageSize: INGESTION_PAGE_SIZE
  };
}
