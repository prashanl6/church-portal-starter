-- CreateTable
CREATE TABLE "ProcessAttachment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "processDocId" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "storedPath" TEXT NOT NULL,
    "mimeType" TEXT,
    "byteSize" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProcessAttachment_processDocId_fkey" FOREIGN KEY ("processDocId") REFERENCES "ProcessDoc" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ProcessAttachment_processDocId_idx" ON "ProcessAttachment"("processDocId");
