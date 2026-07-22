/*
  Warnings:

  - You are about to drop the column `imageUrl` on the `Listing` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Listing" DROP COLUMN "imageUrl",
ADD COLUMN     "imageUrls" TEXT[];
