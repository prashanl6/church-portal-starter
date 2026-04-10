-- CreateTable
CREATE TABLE "HallBookingSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ratePer30Minutes" REAL NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "HallBookingSettings" ("id", "ratePer30Minutes", "updatedAt") VALUES (1, 0, CURRENT_TIMESTAMP);
