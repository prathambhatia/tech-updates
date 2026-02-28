ALTER TABLE "Article"
ADD COLUMN "categoryId" UUID;

CREATE INDEX "Article_categoryId_idx" ON "Article"("categoryId");

ALTER TABLE "Article"
ADD CONSTRAINT "Article_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
