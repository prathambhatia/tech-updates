import { plainText } from "@/utils/text";

export const CATEGORY_SLUGS = {
  ARCHITECTURE: "big-tech-architecture",
  AI_AGENTS: "ml-ai-agents",
  OUTAGES: "big-tech-outages",
  INTERVIEWS: "interview-experience"
} as const;

export const DISPLAY_CATEGORY_SLUGS = [
  CATEGORY_SLUGS.ARCHITECTURE,
  CATEGORY_SLUGS.AI_AGENTS,
  CATEGORY_SLUGS.OUTAGES,
  CATEGORY_SLUGS.INTERVIEWS
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

// Strong signals — any one match is enough to flag as interview content
const STRONG_INTERVIEW_KEYWORDS = [
  "interview experience",
  "interview at google",
  "interview at amazon",
  "interview at microsoft",
  "interview at uber",
  "interview at meta",
  "interview at facebook",
  "interview at apple",
  "interview at stripe",
  "interview at netflix",
  "interview at swiggy",
  "interview at zomato",
  "interview at flipkart",
  "interview at linkedin",
  "interview at spotify",
  "sde interview",
  "sde-1 interview",
  "sde-2 interview",
  "sde 1 interview",
  "sde 2 interview",
  "software engineer interview",
  "software developer interview",
  "got an offer",
  "received an offer",
  "offer letter",
  "got rejected",
  "i got the job",
  "how i cracked",
  "how i got into",
  "my hiring process",
  "my interview journey",
  "interview preparation guide",
  "cracking the coding interview"
];

// Supporting signals — need 2+ to classify as interview
const SUPPORTING_INTERVIEW_KEYWORDS = [
  "coding round",
  "coding interview",
  "technical round",
  "technical interview",
  "onsite interview",
  "onsite round",
  "hiring process",
  "interview prep",
  "interview process",
  "leetcode",
  "hackerrank",
  "dsa round",
  "data structures",
  "take home assignment",
  "take-home",
  "behavioral round",
  "hr round",
  "machine coding",
  "low level design",
  "high level design",
  "lld round",
  "hld round"
];

const AI_STRONG_KEYWORDS = [
  "llm",
  "large language model",
  "machine learning",
  "ai agent",
  "agentic",
  "agent",
  "agents",
  "model release",
  "model training",
  "model inference",
  "rag",
  "retrieval augmented",
  "transformer",
  "inference",
  "prompt",
  "fine-tuning",
  "finetuning",
  "embedding",
  "reasoning",
  "multimodal",
  "generative ai",
  "foundation model",
  "gpt",
  "bert",
  "diffusion model",
  "vector database",
  "vector search",
  "semantic search"
];

const AI_SUPPORTING_KEYWORDS = [
  "ml",
  "neural",
  "token",
  "context window",
  "benchmark",
  "hallucination",
  "alignment"
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
  "sharding",
  "partitioning",
  "partition",
  "capacity planning",
  "multi-region",
  "event sourcing",
  "idempotency",
  "saga",
  "cache invalidation",
  "fault tolerance",
  "system design",
  "microservices",
  "api design",
  "service mesh",
  "load balancing",
  "cdn",
  "caching",
  "rate limiting",
  "message queue",
  "kafka",
  "kubernetes",
  "infrastructure",
  "reliability",
  "availability",
  "consistency",
  "cap theorem",
  "data pipeline",
  "data engineering",
  "streaming",
  "real-time",
  "batch processing",
  "observability",
  "monitoring",
  "tracing",
  "resiliency",
  "circuit breaker",
  "deployment",
  "zero downtime"
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

const ARCHITECTURE_SOURCE_NAMES = new Set([
  "Cloudflare",
  "Netflix Tech Blog",
  "Uber Engineering",
  "Stripe Engineering",
  "Dropbox Tech",
  "Meta Engineering",
  "Google Cloud Blog",
  "AWS Architecture",
  "Slack Engineering",
  "Lyft Engineering",
  "GitHub Engineering",
  "Datadog Engineering",
  "LinkedIn Engineering",
  "Spotify Engineering"
]);

const INTERVIEW_SOURCE_NAMES = new Set([
  "Medium: Interview Experience",
  "Medium: SDE Interview",
  "Medium: Coding Interview",
  "Medium: Tech Interview"
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

function isInterviewRelated(content: string, sourceName: string): boolean {
  if (INTERVIEW_SOURCE_NAMES.has(sourceName)) {
    return true;
  }

  if (containsAnyKeyword(content, STRONG_INTERVIEW_KEYWORDS)) {
    return true;
  }

  return countKeywordMatches(content, SUPPORTING_INTERVIEW_KEYWORDS) >= 2;
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
  const normalized = plainText(
    [
      input.title,
      input.summary ?? "",
      input.contentPreview ?? "",
      ...(input.tags ?? [])
    ].join(" ")
  ).toLowerCase();

  // Interview check first — these are very distinct articles
  if (isInterviewRelated(normalized, input.sourceName)) {
    return CATEGORY_SLUGS.INTERVIEWS;
  }

  if (isOutageRelated(normalized)) {
    return CATEGORY_SLUGS.OUTAGES;
  }

  const architectureScore = countKeywordMatches(normalized, ARCHITECTURE_KEYWORDS);
  const aiStrongScore = countKeywordMatches(normalized, AI_STRONG_KEYWORDS);
  const aiSupportingScore = countKeywordMatches(normalized, AI_SUPPORTING_KEYWORDS);
  const aiScore = aiStrongScore * 2 + aiSupportingScore;

  // Strong architecture signal wins unless AI signal is clearly stronger
  if (architectureScore >= 2 && architectureScore >= aiScore) {
    return CATEGORY_SLUGS.ARCHITECTURE;
  }

  // Strong AI signal
  if (aiStrongScore >= 1 || aiScore >= 3) {
    return CATEGORY_SLUGS.AI_AGENTS;
  }

  // Weak architecture signal
  if (architectureScore >= 1) {
    return CATEGORY_SLUGS.ARCHITECTURE;
  }

  // Fall back to source-based classification
  if (AI_SOURCE_NAMES.has(input.sourceName)) {
    return CATEGORY_SLUGS.AI_AGENTS;
  }

  if (ARCHITECTURE_SOURCE_NAMES.has(input.sourceName)) {
    return CATEGORY_SLUGS.ARCHITECTURE;
  }

  // Default: architecture (system design is the primary focus)
  return CATEGORY_SLUGS.ARCHITECTURE;
}
