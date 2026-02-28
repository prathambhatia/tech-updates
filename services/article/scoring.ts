import { countWords, estimateReadingTime } from "@/utils/text";

import { SOURCE_POPULARITY_WEIGHTS } from "@/services/article/sources";
import type { KeywordRule } from "@/services/article/scoring.types";
import type { ArticleRecord } from "@/services/article/types";

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

export function asFiniteNumber(value: number, fallback = 0): number {
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

export function computeLearningTracks(record: ArticleRecord): { tracks: string[]; keywordBoost: number } {
  const content = normalizedContent(record);
  const trackScore = scoreKeywordRules(content, TRACK_RULES);
  return {
    tracks: trackScore.labels,
    keywordBoost: trackScore.score
  };
}

export function isLowSignalArticle(record: ArticleRecord): boolean {
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

export function effectiveReadingTime(record: ArticleRecord): number {
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

export function resolvedBreakthroughScore(record: ArticleRecord): number {
  const content = normalizedContent(record);
  const computed = scoreKeywordRules(content, BREAKTHROUGH_RULES).score;
  return Math.max(asFiniteNumber(record.breakthroughScore, 0), asFiniteNumber(computed, 0));
}

export function resolvedHotTopicScore(record: ArticleRecord): number {
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

export function computePopularityScore(record: ArticleRecord): number {
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

export function computeJuniorRelevanceScore(record: ArticleRecord): number {
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

export function importanceLevel(score: number): "must-read" | "recommended" | "optional" {
  if (score >= 100) {
    return "must-read";
  }

  if (score >= 74) {
    return "recommended";
  }

  return "optional";
}
