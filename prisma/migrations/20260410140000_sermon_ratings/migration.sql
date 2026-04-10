-- CreateTable
CREATE TABLE "SermonRating" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sermonId" INTEGER NOT NULL,
    "clientId" TEXT NOT NULL,
    "stars" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SermonRating_sermonId_fkey" FOREIGN KEY ("sermonId") REFERENCES "Sermon" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

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
    "status" TEXT NOT NULL DEFAULT 'published',
    "tagsJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Sermon" ("createdAt", "date", "dateOnly", "id", "link", "speaker", "status", "tagsJson", "title", "updatedAt") SELECT "createdAt", "date", "dateOnly", "id", "link", "speaker", "status", "tagsJson", "title", "updatedAt" FROM "Sermon";
DROP TABLE "Sermon";
ALTER TABLE "new_Sermon" RENAME TO "Sermon";
CREATE UNIQUE INDEX "Sermon_dateOnly_key" ON "Sermon"("dateOnly");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "SermonRating_sermonId_idx" ON "SermonRating"("sermonId");

-- CreateIndex
CREATE UNIQUE INDEX "SermonRating_sermonId_clientId_key" ON "SermonRating"("sermonId", "clientId");
