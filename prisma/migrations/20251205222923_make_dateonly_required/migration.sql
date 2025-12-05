/*
  Warnings:

  - Made the column `dateOnly` on table `Sermon` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Sermon" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "speaker" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "dateOnly" DATETIME NOT NULL,
    "link" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "rating" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'published',
    "tagsJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Sermon" ("createdAt", "date", "dateOnly", "id", "link", "rating", "speaker", "status", "tagsJson", "title", "updatedAt", "views") SELECT "createdAt", "date", "dateOnly", "id", "link", "rating", "speaker", "status", "tagsJson", "title", "updatedAt", "views" FROM "Sermon";
DROP TABLE "Sermon";
ALTER TABLE "new_Sermon" RENAME TO "Sermon";
CREATE UNIQUE INDEX "Sermon_dateOnly_key" ON "Sermon"("dateOnly");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
