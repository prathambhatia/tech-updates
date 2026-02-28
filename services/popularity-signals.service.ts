import { env } from "@/lib/env";
import { prisma } from "@/lib/db";

type SignalResult = {
  hnScore: number;
  redditScore: number;
  xScore: number;
  githubScore: number;
  totalScore: number;
};

type RefreshResult = {
  checkedCount: number;
  updatedCount: number;
  errors: string[];
  trendingKeywords: string[];
};

type BackfillResult = {
  checkedCount: number;
  updatedCount: number;
};

export type PopularityV2Input = {
  publishedAt: Date;
  externalPopularityScore: number;
  externalPopularityPrevScore: number;
  viralVelocityScore: number;
  hotTopicScore: number;
  breakthroughScore: number;
  popularityLastCheckedAt?: Date | null;
  sourceName?: string | null;
  readingTime?: number | null;
  title?: string | null;
  summary?: string | null;
  contentPreview?: string | null;
  tags?: string[];
};

const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "your",
  "have",
  "will",
  "about",
  "into",
  "their",
  "there",
  "what",
  "when",
  "where",
  "which",
  "while",
  "than",
  "been",
  "being",
  "also",
  "more",
  "most",
  "some",
  "many",
  "much",
  "just",
  "using",
  "used",
  "over",
  "under",
  "after",
  "before",
  "between",
  "through",
  "new",
  "post",
  "blog",
  "article",
  "thread",
  "today",
  "week",
  "month",
  "year",
  "read",
  "news",
  "update",
  "updates",
  "engineering",
  "software",
  "you",
  "yourself",
  "ours",
  "ourselves",
  "they",
  "them",
  "their",
  "theirs",
  "can",
  "could",
  "would",
  "should",
  "rel",
  "nofollow",
  "href"
]);

const TECH_CONTEXT_TOKENS = new Set([
  "ai",
  "llm",
  "model",
  "models",
  "agent",
  "agents",
  "rag",
  "transformer",
  "inference",
  "reasoning",
  "mcp",
  "system",
  "systems",
  "design",
  "distributed",
  "architecture",
  "kubernetes",
  "cloud",
  "database",
  "latency",
  "scaling",
  "throughput",
  "reliability",
  "observability",
  "incident",
  "platform",
  "sre",
  "gpu",
  "security",
  "runtime",
  "compiler",
  "api",
  "apis",
  "microservice",
  "microservices",
  "benchmark",
  "evaluation",
  "eval",
  "vector"
]);

const BREAKTHROUGH_RULES: Array<{ boost: number; keywords: string[] }> = [
  {
    boost: 18,
    keywords: ["breakthrough", "state-of-the-art", "state of the art", "sota", "world model", "frontier model"]
  },
  {
    boost: 16,
    keywords: ["reasoning model", "reasoning", "agentic", "self-improving", "test-time compute"]
  },
  {
    boost: 14,
    keywords: ["new model", "model release", "announcing", "introducing", "launch", "rollout", "ga release"]
  },
  {
    boost: 12,
    keywords: ["benchmark", "eval", "evaluation", "open-source release", "paper", "research preview"]
  },
  {
    boost: 10,
    keywords: ["mcp", "model context protocol", "multimodal", "tool use", "memory", "long context"]
  }
];

const SOURCE_QUALITY_WEIGHTS: Record<string, number> = {
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

const LOW_SIGNAL_PATTERNS = ["support@", "press@", "download press kit", "copyright", "all rights reserved"];
const DEFAULT_POPULARITY_HALF_LIFE_HOURS = 168;
const POPULARITY_PRIOR = 50;

const USER_AGENT = "AI-Systems-Intelligence/1.0";

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function safeRound(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Number(value.toFixed(2));
}

function sigmoid(value: number): number {
  return 1 / (1 + Math.exp(-value));
}

function canonicalVariants(rawUrl: string): string[] {
  try {
    const parsed = new URL(rawUrl);
    parsed.hash = "";

    const noTrackingKeys = [...parsed.searchParams.keys()].filter(
      (key) => key.startsWith("utm_") || key === "ref" || key === "source"
    );
    for (const key of noTrackingKeys) {
      parsed.searchParams.delete(key);
    }

    const noSlash = (() => {
      const copy = new URL(parsed.toString());
      if (copy.pathname !== "/" && copy.pathname.endsWith("/")) {
        copy.pathname = copy.pathname.slice(0, -1);
      }
      return copy.toString();
    })();

    const withSlash = (() => {
      const copy = new URL(parsed.toString());
      if (!copy.pathname.endsWith("/")) {
        copy.pathname = `${copy.pathname}/`;
      }
      return copy.toString();
    })();

    return [...new Set([rawUrl, parsed.toString(), noSlash, withSlash])];
  } catch {
    return [rawUrl];
  }
}

function hoursSince(date: Date | null): number {
  if (!date) {
    return 24;
  }

  const diffMs = Date.now() - date.getTime();
  return Math.max(1, diffMs / (1000 * 60 * 60));
}

function asTextParts(input: Array<string | null | undefined>): string {
  return input
    .filter((item): item is string => Boolean(item && item.trim()))
    .join(" ")
    .toLowerCase();
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#.\-\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(
      (token) =>
        token.length >= 3 &&
        token.length <= 32 &&
        !STOPWORDS.has(token) &&
        !/^\d+$/.test(token) &&
        !token.includes("http") &&
        !token.includes("www") &&
        !token.includes("x2f") &&
        !token.endsWith(".com") &&
        !token.endsWith(".org") &&
        !token.endsWith(".ai")
    );
}

function extractTrendingKeywords(texts: string[]): string[] {
  const tokenCounts = new Map<string, number>();
  const bigramCounts = new Map<string, number>();

  for (const text of texts) {
    const tokens = tokenize(text);

    for (const token of tokens) {
      tokenCounts.set(token, (tokenCounts.get(token) ?? 0) + 1);
    }

    for (let i = 0; i < tokens.length - 1; i += 1) {
      const current = tokens[i];
      const next = tokens[i + 1];
      if (!current || !next) {
        continue;
      }

      const bigram = `${current} ${next}`;
      bigramCounts.set(bigram, (bigramCounts.get(bigram) ?? 0) + 1);
    }
  }

  const topTokens = [...tokenCounts.entries()]
    .filter((entry) => entry[1] >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 45)
    .map((entry) => entry[0])
    .filter((token) => TECH_CONTEXT_TOKENS.has(token));

  const topBigrams = [...bigramCounts.entries()]
    .filter((entry) => entry[1] >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map((entry) => entry[0])
    .filter((phrase) => phrase.split(" ").some((token) => TECH_CONTEXT_TOKENS.has(token)));

  const seedKeywords = [
    "reasoning model",
    "agentic",
    "mcp",
    "model context protocol",
    "rag",
    "distributed systems",
    "observability",
    "incident response",
    "platform engineering",
    "ai coding"
  ];

  return [...new Set([...seedKeywords, ...topBigrams, ...topTokens])];
}

function computeHotTopicScore(content: string, trendingKeywords: string[]): number {
  if (!content || trendingKeywords.length === 0) {
    return 0;
  }

  let score = 0;
  for (const [index, keyword] of trendingKeywords.entries()) {
    if (!content.includes(keyword)) {
      continue;
    }

    // Earlier-ranked keywords carry more weight.
    score += Math.max(3, 14 - Math.floor(index / 4));
  }

  return clamp(score, 0, 160);
}

function computeBreakthroughScore(content: string): number {
  let score = 0;

  for (const rule of BREAKTHROUGH_RULES) {
    if (rule.keywords.some((keyword) => content.includes(keyword))) {
      score += rule.boost;
    }
  }

  if (
    /announcing|introducing|launch|released|rollout/.test(content) &&
    /model|inference|agent|architecture|database|platform/.test(content)
  ) {
    score += 14;
  }

  return clamp(score, 0, 150);
}

function contentLooksLowSignal(input: PopularityV2Input): boolean {
  const merged = asTextParts([input.title, input.summary, input.contentPreview, ...(input.tags ?? [])]);
  if (!merged) {
    return true;
  }

  if ((input.title ?? "").trim().length < 12) {
    return true;
  }

  return LOW_SIGNAL_PATTERNS.some((pattern) => merged.includes(pattern));
}

export function computePopularityV2(input: PopularityV2Input, now = new Date()): {
  score: number;
  confidence: number;
} {
  const halfLifeHours =
    Number.isFinite(env.POPULARITY_HALF_LIFE_HOURS) && env.POPULARITY_HALF_LIFE_HOURS > 0
      ? env.POPULARITY_HALF_LIFE_HOURS
      : DEFAULT_POPULARITY_HALF_LIFE_HOURS;

  const ageHours = Math.max(0, (now.getTime() - input.publishedAt.getTime()) / (1000 * 60 * 60));
  const decay = Math.exp(-ageHours / halfLifeHours);

  const momentum = input.externalPopularityScore - input.externalPopularityPrevScore;
  const momentumNorm = sigmoid(momentum / 120);
  const viralNorm = clamp(input.viralVelocityScore / 260, 0, 1);
  const trendComponent = clamp((viralNorm * 0.4 + momentumNorm * 0.35 + decay * 0.25) * 100, 0, 100);

  const sourceNorm = clamp((SOURCE_QUALITY_WEIGHTS[input.sourceName ?? ""] ?? 10) / 22, 0, 1);
  const depthNorm = clamp((input.readingTime ?? 0) / 20, 0, 1);
  const breakthroughNorm = clamp(input.breakthroughScore / 150, 0, 1);
  const hotTopicNorm = clamp(input.hotTopicScore / 160, 0, 1);
  const lowSignalPenalty = contentLooksLowSignal(input) ? 22 : 0;
  const qualityComponent = clamp(
    (sourceNorm * 0.35 + depthNorm * 0.2 + breakthroughNorm * 0.25 + hotTopicNorm * 0.2) * 100 - lowSignalPenalty,
    0,
    100
  );

  const externalNorm = clamp(Math.log1p(Math.max(0, input.externalPopularityScore)) / Math.log1p(1100), 0, 1);
  const viralEngagementNorm = clamp(Math.log1p(Math.max(0, input.viralVelocityScore)) / Math.log1p(260), 0, 1);
  const engagementComponent = clamp((externalNorm * 0.7 + viralEngagementNorm * 0.3) * 100, 0, 100);

  const signalEvidence = [
    input.externalPopularityScore > 0 ? 1 : 0,
    input.viralVelocityScore > 0 ? 1 : 0,
    input.hotTopicScore > 0 ? 1 : 0,
    input.breakthroughScore > 0 ? 1 : 0
  ];
  const signalCoverage = signalEvidence.reduce((sum, value) => sum + value, 0) / signalEvidence.length;
  const freshnessConfidence = clamp(1 - ageHours / (halfLifeHours * 6), 0.25, 1);
  const recencyConfidenceBoost = ageHours <= 48 ? 0.08 : 0;
  const confidence = clamp(0.25 + signalCoverage * 0.55 + freshnessConfidence * 0.2 + recencyConfidenceBoost, 0, 1);

  const baseScore = trendComponent * 0.45 + qualityComponent * 0.35 + engagementComponent * 0.2;
  const score = clamp(baseScore * confidence + POPULARITY_PRIOR * (1 - confidence), 0, 100);

  return {
    score: safeRound(score),
    confidence: safeRound(confidence)
  };
}

async function fetchHackerNewsScore(url: string): Promise<number> {
  try {
    const variants = canonicalVariants(url);
    let total = 0;

    for (const variant of variants) {
      const endpoint = `https://hn.algolia.com/api/v1/search?tags=story&query=${encodeURIComponent(variant)}`;
      const response = await fetch(endpoint, {
        headers: {
          "User-Agent": USER_AGENT
        }
      });

      if (!response.ok) {
        continue;
      }

      const data = (await response.json()) as {
        hits?: Array<{
          url?: string;
          points?: number;
          num_comments?: number;
        }>;
      };

      const hits = data.hits ?? [];
      for (const hit of hits) {
        if (!hit.url) {
          continue;
        }

        const points = hit.points ?? 0;
        const comments = hit.num_comments ?? 0;
        total += points + comments * 1.6;
      }
    }

    return clamp(Math.round(total), 0, 420);
  } catch {
    return 0;
  }
}

async function fetchRedditScore(url: string): Promise<number> {
  try {
    const variants = canonicalVariants(url);
    let total = 0;

    for (const variant of variants) {
      const endpoint = `https://www.reddit.com/search.json?q=url:${encodeURIComponent(
        variant
      )}&sort=top&t=month&limit=20`;
      const response = await fetch(endpoint, {
        headers: {
          "User-Agent": USER_AGENT
        }
      });

      if (!response.ok) {
        continue;
      }

      const data = (await response.json()) as {
        data?: {
          children?: Array<{
            data?: {
              score?: number;
              num_comments?: number;
            };
          }>;
        };
      };

      const children = data.data?.children ?? [];
      const score = children.reduce((sum, child) => {
        const points = child.data?.score ?? 0;
        const comments = child.data?.num_comments ?? 0;
        return sum + points + comments * 1.2;
      }, 0);

      total += score;
    }

    return clamp(Math.round(total), 0, 420);
  } catch {
    return 0;
  }
}

async function fetchXScore(url: string): Promise<number> {
  if (!env.X_BEARER_TOKEN) {
    return 0;
  }

  try {
    const variants = canonicalVariants(url);
    const query = variants
      .slice(0, 2)
      .map((variant) => `"${variant}"`)
      .join(" OR ");

    const endpoint =
      `https://api.x.com/2/tweets/search/recent?query=${encodeURIComponent(
        `${query} -is:retweet lang:en`
      )}&tweet.fields=public_metrics&max_results=25`;
    const response = await fetch(endpoint, {
      headers: {
        "User-Agent": USER_AGENT,
        Authorization: `Bearer ${env.X_BEARER_TOKEN}`
      }
    });

    if (!response.ok) {
      return 0;
    }

    const data = (await response.json()) as {
      data?: Array<{
        public_metrics?: {
          like_count?: number;
          retweet_count?: number;
          reply_count?: number;
          quote_count?: number;
        };
      }>;
    };

    const tweets = data.data ?? [];
    const total = tweets.reduce((sum, tweet) => {
      const metrics = tweet.public_metrics;
      if (!metrics) {
        return sum;
      }

      const likes = metrics.like_count ?? 0;
      const retweets = metrics.retweet_count ?? 0;
      const replies = metrics.reply_count ?? 0;
      const quotes = metrics.quote_count ?? 0;

      return sum + likes + retweets * 2 + replies * 1.5 + quotes * 1.8;
    }, 0);

    return clamp(Math.round(total), 0, 500);
  } catch {
    return 0;
  }
}

async function fetchGithubScore(url: string): Promise<number> {
  try {
    const endpoint = `https://api.github.com/search/issues?q=${encodeURIComponent(`"${url}"`)}&per_page=20`;
    const response = await fetch(endpoint, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/vnd.github+json",
        ...(env.GITHUB_TOKEN ? { Authorization: `Bearer ${env.GITHUB_TOKEN}` } : {})
      }
    });

    if (!response.ok) {
      return 0;
    }

    const data = (await response.json()) as {
      items?: Array<{
        comments?: number;
        reactions?: {
          total_count?: number;
        };
      }>;
    };

    const items = data.items ?? [];
    const total = items.reduce((sum, item) => {
      const comments = item.comments ?? 0;
      const reactions = item.reactions?.total_count ?? 0;
      return sum + comments * 1.8 + reactions * 2.2;
    }, 0);

    return clamp(Math.round(total), 0, 220);
  } catch {
    return 0;
  }
}

async function fetchTrendingTextCorpus(): Promise<string[]> {
  const texts: string[] = [];

  try {
    const hnResponse = await fetch("https://hn.algolia.com/api/v1/search?tags=front_page", {
      headers: { "User-Agent": USER_AGENT }
    });
    if (hnResponse.ok) {
      const data = (await hnResponse.json()) as {
        hits?: Array<{
          title?: string;
          story_text?: string;
        }>;
      };

      for (const hit of data.hits ?? []) {
        const combined = asTextParts([hit.title, hit.story_text]);
        if (combined) {
          texts.push(combined);
        }
      }
    }
  } catch {
    // Ignore transient signal source failures.
  }

  const subreddits = ["programming", "MachineLearning", "artificial", "devops", "systemdesign"];

  for (const subreddit of subreddits) {
    try {
      const response = await fetch(`https://www.reddit.com/r/${subreddit}/hot.json?limit=30`, {
        headers: {
          "User-Agent": USER_AGENT
        }
      });

      if (!response.ok) {
        continue;
      }

      const data = (await response.json()) as {
        data?: {
          children?: Array<{
            data?: {
              title?: string;
              selftext?: string;
            };
          }>;
        };
      };

      for (const child of data.data?.children ?? []) {
        const combined = asTextParts([child.data?.title, child.data?.selftext]);
        if (combined) {
          texts.push(combined);
        }
      }
    } catch {
      // Ignore transient signal source failures.
    }
  }

  return texts;
}

export async function getExternalSignalScore(url: string): Promise<SignalResult> {
  const [hnScore, redditScore, xScore, githubScore] = await Promise.all([
    fetchHackerNewsScore(url),
    fetchRedditScore(url),
    fetchXScore(url),
    fetchGithubScore(url)
  ]);

  const weightedTotal = hnScore * 1 + redditScore * 1 + xScore * 1.15 + githubScore * 0.9;

  return {
    hnScore,
    redditScore,
    xScore,
    githubScore,
    totalScore: clamp(Math.round(weightedTotal), 0, 1100)
  };
}

export async function refreshExternalPopularitySignals(options?: {
  daysBack?: number;
  limit?: number;
}): Promise<RefreshResult> {
  const daysBack = options?.daysBack ?? 35;
  const limit = options?.limit ?? 260;
  const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

  const trendingCorpus = await fetchTrendingTextCorpus();
  const trendingKeywords = extractTrendingKeywords(trendingCorpus);

  const articles = await prisma.article.findMany({
    where: {
      publishedAt: {
        gte: since
      }
    },
    orderBy: {
      publishedAt: "desc"
    },
    take: limit,
    select: {
      id: true,
      url: true,
      title: true,
      summary: true,
      contentPreview: true,
      readingTime: true,
      externalPopularityScore: true,
      externalPopularityPrevScore: true,
      viralVelocityScore: true,
      hotTopicScore: true,
      breakthroughScore: true,
      popularityScoreV2: true,
      popularityConfidence: true,
      popularityLastCheckedAt: true,
      publishedAt: true,
      source: {
        select: {
          name: true
        }
      },
      tags: {
        select: {
          tag: {
            select: {
              name: true
            }
          }
        }
      }
    }
  });

  let updatedCount = 0;
  const errors: string[] = [];

  for (const article of articles) {
    try {
      const signal = await getExternalSignalScore(article.url);
      const previousScore = article.externalPopularityScore;
      const delta = signal.totalScore - previousScore;
      const refreshWindowHours = hoursSince(article.popularityLastCheckedAt);
      const velocityPerHour = delta / refreshWindowHours;

      const viralVelocityScore = clamp(
        Math.round(article.viralVelocityScore * 0.55 + delta * 0.9 + velocityPerHour * 28),
        0,
        260
      );

      const articleText = asTextParts([
        article.title,
        article.summary,
        article.contentPreview,
        ...article.tags.map((entry) => entry.tag.name)
      ]);

      const hotTopicScore = computeHotTopicScore(articleText, trendingKeywords);
      const breakthroughScore = computeBreakthroughScore(articleText);
      const nextExternalScore = signal.totalScore;
      const v2 = computePopularityV2(
        {
          publishedAt: article.publishedAt,
          externalPopularityScore: nextExternalScore,
          externalPopularityPrevScore: previousScore,
          viralVelocityScore,
          hotTopicScore,
          breakthroughScore,
          popularityLastCheckedAt: article.popularityLastCheckedAt,
          sourceName: article.source.name,
          readingTime: article.readingTime,
          title: article.title,
          summary: article.summary,
          contentPreview: article.contentPreview,
          tags: article.tags.map((entry) => entry.tag.name)
        },
        new Date()
      );

      await prisma.article.update({
        where: { id: article.id },
        data: {
          externalPopularityPrevScore: previousScore,
          externalPopularityScore: nextExternalScore,
          viralVelocityScore,
          hotTopicScore,
          breakthroughScore,
          ...(env.POPULARITY_V2_ENABLED
            ? {
                popularityScoreV2: v2.score,
                popularityConfidence: v2.confidence,
                popularityComputedAt: new Date()
              }
            : {}),
          popularityLastCheckedAt: new Date()
        }
      });

      updatedCount += 1;
      await sleep(120);
    } catch (error) {
      errors.push(
        `Failed signal refresh for ${article.url}: ${error instanceof Error ? error.message : "unknown error"}`
      );
    }
  }

  return {
    checkedCount: articles.length,
    updatedCount,
    errors,
    trendingKeywords: trendingKeywords.slice(0, 20)
  };
}

export async function backfillPopularityV2(options?: {
  daysBack?: number;
  limit?: number;
}): Promise<BackfillResult> {
  const daysBack = options?.daysBack ?? 365;
  const limit = options?.limit ?? 5000;
  const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

  const articles = await prisma.article.findMany({
    where: {
      publishedAt: {
        gte: since
      }
    },
    orderBy: {
      publishedAt: "desc"
    },
    take: limit,
    select: {
      id: true,
      title: true,
      summary: true,
      contentPreview: true,
      readingTime: true,
      publishedAt: true,
      externalPopularityScore: true,
      externalPopularityPrevScore: true,
      viralVelocityScore: true,
      hotTopicScore: true,
      breakthroughScore: true,
      popularityLastCheckedAt: true,
      source: {
        select: {
          name: true
        }
      },
      tags: {
        select: {
          tag: {
            select: {
              name: true
            }
          }
        }
      }
    }
  });

  let updatedCount = 0;
  for (const article of articles) {
    const v2 = computePopularityV2(
      {
        publishedAt: article.publishedAt,
        externalPopularityScore: article.externalPopularityScore,
        externalPopularityPrevScore: article.externalPopularityPrevScore,
        viralVelocityScore: article.viralVelocityScore,
        hotTopicScore: article.hotTopicScore,
        breakthroughScore: article.breakthroughScore,
        popularityLastCheckedAt: article.popularityLastCheckedAt,
        sourceName: article.source.name,
        readingTime: article.readingTime,
        title: article.title,
        summary: article.summary,
        contentPreview: article.contentPreview,
        tags: article.tags.map((entry) => entry.tag.name)
      },
      new Date()
    );

    await prisma.article.update({
      where: { id: article.id },
      data: {
        popularityScoreV2: v2.score,
        popularityConfidence: v2.confidence,
        popularityComputedAt: new Date()
      }
    });
    updatedCount += 1;
  }

  return {
    checkedCount: articles.length,
    updatedCount
  };
}
