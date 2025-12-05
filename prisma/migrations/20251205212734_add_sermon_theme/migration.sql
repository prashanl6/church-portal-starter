/*
  Warnings:

  - You are about to drop the column `ip` on the `AuditLog` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AuditLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "actorId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "theme" TEXT,
    "resourceType" TEXT NOT NULL,
    "resourceId" INTEGER NOT NULL,
    "beforeJson" TEXT,
    "afterJson" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_AuditLog" ("action", "actorId", "afterJson", "beforeJson", "createdAt", "id", "resourceId", "resourceType", "userAgent") SELECT "action", "actorId", "afterJson", "beforeJson", "createdAt", "id", "resourceId", "resourceType", "userAgent" FROM "AuditLog";
DROP TABLE "AuditLog";
ALTER TABLE "new_AuditLog" RENAME TO "AuditLog";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
