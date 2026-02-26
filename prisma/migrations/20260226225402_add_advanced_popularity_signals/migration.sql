-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "breakthroughScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "externalPopularityPrevScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "hotTopicScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "viralVelocityScore" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Article_viralVelocityScore_idx" ON "Article"("viralVelocityScore");

-- CreateIndex
CREATE INDEX "Article_hotTopicScore_idx" ON "Article"("hotTopicScore");
