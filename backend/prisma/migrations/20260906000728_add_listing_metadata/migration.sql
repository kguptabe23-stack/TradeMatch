/*
  Warnings:

  - Added the required column `category` to the `Listing` table without a default value. This is not possible if the table is not empty.
  - Added the required column `condition` to the `Listing` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Listing" ADD COLUMN     "category" TEXT NOT NULL,
ADD COLUMN     "condition" TEXT NOT NULL,
ADD COLUMN     "tags" TEXT[];

-- CreateIndex
CREATE INDEX "Listing_category_idx" ON "Listing"("category");
