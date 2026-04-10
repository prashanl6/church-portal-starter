-- Rename legacy table (data preserved for follow-up script `scripts/migrate-legacy-people-event.js`)
ALTER TABLE "PeopleEvent" RENAME TO "_LegacyPeopleEvent";

-- CreateTable
CREATE TABLE "ChurchIndividual" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "displayName" TEXT NOT NULL,
    "birthDate" DATETIME,
    "email" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "dateOfDeath" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "WeddingAnniversary" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "individualAId" INTEGER NOT NULL,
    "individualBId" INTEGER NOT NULL,
    "anniversaryDate" DATETIME NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WeddingAnniversary_individualAId_fkey" FOREIGN KEY ("individualAId") REFERENCES "ChurchIndividual" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "WeddingAnniversary_individualBId_fkey" FOREIGN KEY ("individualBId") REFERENCES "ChurchIndividual" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "WeddingAnniversary_individualAId_idx" ON "WeddingAnniversary"("individualAId");

-- CreateIndex
CREATE INDEX "WeddingAnniversary_individualBId_idx" ON "WeddingAnniversary"("individualBId");

-- Copy birthday rows from legacy
INSERT INTO "ChurchIndividual" ("displayName", "birthDate", "email", "phone", "notes", "dateOfDeath", "status", "createdAt", "updatedAt")
SELECT "personName", "date", "email", "phone", "notes", "dateOfDeath", "status", "createdAt", "updatedAt"
FROM "_LegacyPeopleEvent" WHERE "type" = 'birthday';
