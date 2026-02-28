import { plainText } from "@/utils/text";

export const CATEGORY_SLUGS = {
  ARCHITECTURE: "big-tech-architecture",
  AI_AGENTS: "ml-ai-agents",
  OUTAGES: "big-tech-outages",
  MEDIUM: "popular-medium-engineering"
} as const;

export const DISPLAY_CATEGORY_SLUGS = [
  CATEGORY_SLUGS.ARCHITECTURE,
  CATEGORY_SLUGS.AI_AGENTS,
  CATEGORY_SLUGS.OUTAGES,
  CATEGORY_SLUGS.MEDIUM
] as const;

const STRONG_OUTAGE_KEYWORDS = [
  "outage",
  "incident report",
  "root cause",
  "security advisory",
  "credential leak",
  "misconfiguration",
  "service disruption",
  "data breach",
  "security incident",
  "postmortem",
  "post-mortem",
  "incident response",
  "exposed"
];

const OUTAGE_SUPPORTING_KEYWORDS = [
  "incident",
  "downtime",
  "breach",
  "vulnerability",
  "cve",
  "ddos",
  "leak",
  "data leak",
  "exploit"
];

const OUTAGE_NOISE_KEYWORDS = [
  "prompt injection attack",
  "adversarial attack",
  "model attack",
  "attack benchmark",
  "red team",
  "safety eval"
];

const AI_KEYWORDS = [
  "llm",
  "ml",
  "machine learning",
  "ai",
  "agent",
  "agents",
  "model",
  "rag",
  "transformer",
  "inference",
  "prompt",
  "fine-tuning",
  "finetuning",
  "embedding",
  "reasoning"
];

const ARCHITECTURE_KEYWORDS = [
  "architecture",
  "distributed",
  "database",
  "replication",
  "migration",
  "scalability",
  "scaling",
  "throughput",
  "latency",
  "consensus",
  "event driven",
  "event-driven",
  "queue",
  "partition",
  "fault tolerance"
];

const AI_SOURCE_NAMES = new Set([
  "OpenAI",
  "Anthropic",
  "Cognition",
  "HuggingFace",
  "Google DeepMind Blog",
  "LangChain",
  "Vercel AI"
]);

function containsAnyKeyword(content: string, keywords: string[]): boolean {
  return keywords.some((keyword) => content.includes(keyword));
}

function countKeywordMatches(content: string, keywords: string[]): number {
  let count = 0;
  for (const keyword of keywords) {
    if (content.includes(keyword)) {
      count += 1;
    }
  }
  return count;
}

function isOutageRelated(content: string): boolean {
  if (containsAnyKeyword(content, OUTAGE_NOISE_KEYWORDS)) {
    return false;
  }

  if (containsAnyKeyword(content, STRONG_OUTAGE_KEYWORDS)) {
    return true;
  }

  return countKeywordMatches(content, OUTAGE_SUPPORTING_KEYWORDS) >= 2;
}

export function isMediumFeed(input: { sourceName: string; sourceUrl: string; sourceRssUrl: string }): boolean {
  const sourceName = input.sourceName.toLowerCase();
  return (
    sourceName.startsWith("medium:") ||
    input.sourceUrl.includes("medium.com") ||
    input.sourceRssUrl.includes("medium.com")
  );
}

export function resolveArticleCategorySlug(input: {
  sourceName: string;
  sourceUrl: string;
  sourceRssUrl: string;
  title: string;
  summary?: string | null;
  contentPreview?: string | null;
  tags?: string[];
}): string {
  if (isMediumFeed(input)) {
    return CATEGORY_SLUGS.MEDIUM;
  }

  const normalized = plainText(
    [
      input.title,
      input.summary ?? "",
      input.contentPreview ?? "",
      ...(input.tags ?? [])
    ].join(" ")
  ).toLowerCase();

  if (isOutageRelated(normalized)) {
    return CATEGORY_SLUGS.OUTAGES;
  }

  if (containsAnyKeyword(normalized, AI_KEYWORDS)) {
    return CATEGORY_SLUGS.AI_AGENTS;
  }

  if (containsAnyKeyword(normalized, ARCHITECTURE_KEYWORDS)) {
    return CATEGORY_SLUGS.ARCHITECTURE;
  }

  if (AI_SOURCE_NAMES.has(input.sourceName)) {
    return CATEGORY_SLUGS.AI_AGENTS;
  }

  return CATEGORY_SLUGS.ARCHITECTURE;
}
