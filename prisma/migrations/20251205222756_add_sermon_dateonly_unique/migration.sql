/*
  Warnings:

  - A unique constraint covering the columns `[dateOnly]` on the table `Sermon` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Sermon" ADD COLUMN "dateOnly" DATETIME;

-- CreateIndex
CREATE UNIQUE INDEX "Sermon_dateOnly_key" ON "Sermon"("dateOnly");
