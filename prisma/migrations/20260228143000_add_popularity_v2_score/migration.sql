-- Add v2 popularity ranking fields
ALTER TABLE "Article"
ADD COLUMN "popularityScoreV2" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "popularityConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "popularityComputedAt" TIMESTAMP(3);

CREATE INDEX "Article_popularityScoreV2_idx" ON "Article"("popularityScoreV2");
