-- CreateTable
CREATE TABLE "CustomerApplication" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "inquiryId" INTEGER NOT NULL,
    "companyName" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "decisionNote" TEXT,
    "decidedAt" DATETIME,
    "decidedByUserId" TEXT,
    "companyId" INTEGER,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CustomerApplication_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CustomerApplication_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "user" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CustomerApplication_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CustomerApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

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
    "industry" TEXT,
    "location" TEXT,
    "ref" TEXT,
    "matchStatus" TEXT,
    "matchedCompanyId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Inquiry_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Inquiry_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Inquiry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Inquiry_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Inquiry_matchedCompanyId_fkey" FOREIGN KEY ("matchedCompanyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Inquiry" ("company", "companyId", "createdAt", "email", "id", "message", "name", "phone", "productId", "status", "type", "userId", "variantId") SELECT "company", "companyId", "createdAt", "email", "id", "message", "name", "phone", "productId", "status", "type", "userId", "variantId" FROM "Inquiry";
DROP TABLE "Inquiry";
ALTER TABLE "new_Inquiry" RENAME TO "Inquiry";
CREATE UNIQUE INDEX "Inquiry_ref_key" ON "Inquiry"("ref");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "CustomerApplication_inquiryId_key" ON "CustomerApplication"("inquiryId");

-- CreateIndex
CREATE INDEX "CustomerApplication_status_idx" ON "CustomerApplication"("status");

-- Normalise existing MEC account numbers (spec §3): trim, uppercase, strip spaces and dashes.
UPDATE "Company"
SET "mecAccountNumber" = UPPER(REPLACE(REPLACE(TRIM("mecAccountNumber"), ' ', ''), '-', ''))
WHERE "mecAccountNumber" IS NOT NULL;
