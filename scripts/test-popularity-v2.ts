import "dotenv/config";

import assert from "node:assert/strict";

import { computePopularityV2 } from "@/services/popularity-signals.service";

function buildInput(overrides: Partial<Parameters<typeof computePopularityV2>[0]> = {}) {
  const now = new Date("2026-02-28T00:00:00.000Z");

  return {
    publishedAt: new Date("2026-02-27T00:00:00.000Z"),
    externalPopularityScore: 400,
    externalPopularityPrevScore: 320,
    viralVelocityScore: 120,
    hotTopicScore: 48,
    breakthroughScore: 52,
    sourceName: "OpenAI",
    readingTime: 9,
    title: "Introducing a better reasoning model for distributed systems",
    summary: "Strong engineering writeup with practical details",
    contentPreview: "Model architecture and deployment notes",
    tags: ["ai", "reasoning", "architecture"],
    popularityLastCheckedAt: new Date("2026-02-27T12:00:00.000Z"),
    ...overrides
  };
}

function main() {
  const now = new Date("2026-02-28T00:00:00.000Z");

  const recent = computePopularityV2(buildInput(), now);
  const older = computePopularityV2(
    buildInput({
      publishedAt: new Date("2026-01-10T00:00:00.000Z")
    }),
    now
  );
  assert(recent.score > older.score, "recency decay should reduce score for older posts");

  const lowViral = computePopularityV2(
    buildInput({
      viralVelocityScore: 20,
      externalPopularityScore: 330,
      externalPopularityPrevScore: 320
    }),
    now
  );
  const highViral = computePopularityV2(
    buildInput({
      viralVelocityScore: 220,
      externalPopularityScore: 520,
      externalPopularityPrevScore: 320
    }),
    now
  );
  assert(highViral.score > lowViral.score, "higher momentum and velocity should increase score");

  const clean = computePopularityV2(buildInput(), now);
  const noisy = computePopularityV2(
    buildInput({
      title: "Help",
      summary: "support@ company all rights reserved",
      contentPreview: "download press kit"
    }),
    now
  );
  assert(clean.score > noisy.score, "low-signal content should receive a penalty");

  const sparse = computePopularityV2(
    buildInput({
      externalPopularityScore: 0,
      externalPopularityPrevScore: 0,
      viralVelocityScore: 0,
      hotTopicScore: 0,
      breakthroughScore: 0
    }),
    now
  );
  assert(sparse.score > 0 && sparse.score < 100, "confidence smoothing should avoid extreme zero/100 outputs");

  console.info("[popularity:test] all assertions passed");
}

main();
