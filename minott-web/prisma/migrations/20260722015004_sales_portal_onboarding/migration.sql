/*
  Warnings:

  - Made the column `email` on table `SalesRep` required. This step will fail if there are existing NULL values in that column.

*/
-- Backfill: reps must have an email before the NOT NULL constraint applies.
UPDATE "SalesRep" SET "email" = 'rep-' || "id" || '@placeholder.invalid'
WHERE "email" IS NULL OR trim("email") = '';

-- AlterTable
ALTER TABLE "user" ADD COLUMN "activatedAt" DATETIME;

-- CreateTable
CREATE TABLE "InquiryNote" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "inquiryId" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "authorLabel" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InquiryNote_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SalesRep" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SalesRep_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_SalesRep" ("active", "createdAt", "email", "id", "name", "phone", "updatedAt") SELECT "active", "createdAt", "email", "id", "name", "phone", "updatedAt" FROM "SalesRep";
DROP TABLE "SalesRep";
ALTER TABLE "new_SalesRep" RENAME TO "SalesRep";
CREATE UNIQUE INDEX "SalesRep_userId_key" ON "SalesRep"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "InquiryNote_inquiryId_idx" ON "InquiryNote"("inquiryId");

-- Backfill: existing users are already active (they have real passwords),
-- so they must not show as "Pending". New invitees are created with NULL.
UPDATE "user" SET "activatedAt" = strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE "activatedAt" IS NULL;
