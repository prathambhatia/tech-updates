-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "externalPopularityScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "popularityLastCheckedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Article_externalPopularityScore_idx" ON "Article"("externalPopularityScore");
