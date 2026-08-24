/*
  Warnings:

  - You are about to drop the column `companyName` on the `user` table. All the data in the column will be lost.
  - You are about to drop the column `salesRepId` on the `user` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "Company" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "mecAccountNumber" TEXT,
    "industry" TEXT,
    "location" TEXT,
    "salesRepId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Company_salesRepId_fkey" FOREIGN KEY ("salesRepId") REFERENCES "SalesRep" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- ---- data backfill: companies from existing customer companyName strings ----
INSERT INTO "Company" ("name", "salesRepId", "updatedAt")
SELECT TRIM(u."companyName"),
       (SELECT u2."salesRepId" FROM "user" u2
          WHERE u2."role" = 'customer'
            AND u2."salesRepId" IS NOT NULL
            AND LOWER(TRIM(u2."companyName")) = LOWER(TRIM(u."companyName"))
          ORDER BY u2."createdAt" LIMIT 1),
       CURRENT_TIMESTAMP
FROM "user" u
WHERE u."role" = 'customer'
  AND u."companyName" IS NOT NULL AND TRIM(u."companyName") <> ''
GROUP BY LOWER(TRIM(u."companyName"));

-- Solo companies for customers without a company name. The company name is
-- temporarily set to the user id (guaranteed unique) purely so the mapping
-- below is exact; it is renamed to the user's display name right after.
INSERT INTO "Company" ("name", "salesRepId", "updatedAt")
SELECT u."id", u."salesRepId", CURRENT_TIMESTAMP
FROM "user" u
WHERE u."role" = 'customer'
  AND (u."companyName" IS NULL OR TRIM(u."companyName") = '');

CREATE TABLE "_cmap" ("userId" TEXT NOT NULL PRIMARY KEY, "companyId" INTEGER NOT NULL);

INSERT INTO "_cmap" ("userId", "companyId")
SELECT u."id", c."id"
FROM "user" u JOIN "Company" c ON LOWER(c."name") = LOWER(TRIM(u."companyName"))
WHERE u."role" = 'customer' AND u."companyName" IS NOT NULL AND TRIM(u."companyName") <> '';

INSERT INTO "_cmap" ("userId", "companyId")
SELECT u."id", c."id"
FROM "user" u JOIN "Company" c ON c."name" = u."id"
WHERE u."role" = 'customer' AND (u."companyName" IS NULL OR TRIM(u."companyName") = '');

UPDATE "Company"
SET "name" = (SELECT u."name" FROM "user" u WHERE u."id" = "Company"."name")
WHERE EXISTS (SELECT 1 FROM "user" u WHERE u."id" = "Company"."name");
-- ---- end companies backfill ----

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Inquiry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "name" TEXT NOT NULL,
    "company" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "message" TEXT,
    "productId" INTEGER,
    "variantId" INTEGER,
    "userId" TEXT,
    "companyId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Inquiry_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Inquiry_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Inquiry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Inquiry_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Inquiry" ("company", "createdAt", "email", "id", "message", "name", "phone", "productId", "status", "type", "userId", "variantId") SELECT "company", "createdAt", "email", "id", "message", "name", "phone", "productId", "status", "type", "userId", "variantId" FROM "Inquiry";
DROP TABLE "Inquiry";
ALTER TABLE "new_Inquiry" RENAME TO "Inquiry";
CREATE TABLE "new_user" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "role" TEXT NOT NULL DEFAULT 'customer',
    "banned" BOOLEAN DEFAULT false,
    "banReason" TEXT,
    "banExpires" DATETIME,
    "phone" TEXT,
    "whatsapp" TEXT,
    "companyId" INTEGER,
    "activatedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "user_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_user" ("activatedAt", "banExpires", "banReason", "banned", "createdAt", "email", "emailVerified", "id", "image", "name", "phone", "role", "updatedAt", "whatsapp") SELECT "activatedAt", "banExpires", "banReason", "banned", "createdAt", "email", "emailVerified", "id", "image", "name", "phone", "role", "updatedAt", "whatsapp" FROM "user";
DROP TABLE "user";
ALTER TABLE "new_user" RENAME TO "user";
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Company_mecAccountNumber_key" ON "Company"("mecAccountNumber");

-- CreateIndex
CREATE INDEX "Company_salesRepId_idx" ON "Company"("salesRepId");

-- ---- data backfill: link users and inquiries to their companies ----
UPDATE "user"
SET "companyId" = (SELECT m."companyId" FROM "_cmap" m WHERE m."userId" = "user"."id")
WHERE EXISTS (SELECT 1 FROM "_cmap" m WHERE m."userId" = "user"."id");

UPDATE "Inquiry"
SET "companyId" = (SELECT m."companyId" FROM "_cmap" m WHERE m."userId" = "Inquiry"."userId")
WHERE "userId" IS NOT NULL
  AND EXISTS (SELECT 1 FROM "_cmap" m WHERE m."userId" = "Inquiry"."userId");

DROP TABLE "_cmap";
-- ---- end backfill ----
