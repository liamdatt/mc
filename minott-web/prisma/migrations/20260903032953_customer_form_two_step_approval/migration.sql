-- AlterTable
ALTER TABLE "Company" ADD COLUMN "accountingEmail" TEXT;
ALTER TABLE "Company" ADD COLUMN "accountingName" TEXT;
ALTER TABLE "Company" ADD COLUMN "accountingPhone" TEXT;
ALTER TABLE "Company" ADD COLUMN "billingCity" TEXT;
ALTER TABLE "Company" ADD COLUMN "billingParish" TEXT;
ALTER TABLE "Company" ADD COLUMN "billingStreet" TEXT;
ALTER TABLE "Company" ADD COLUMN "billingZip" TEXT;
ALTER TABLE "Company" ADD COLUMN "businessType" TEXT;
ALTER TABLE "Company" ADD COLUMN "creditLimit" DECIMAL;
ALTER TABLE "Company" ADD COLUMN "creditTerms" TEXT;
ALTER TABLE "Company" ADD COLUMN "gctStatus" TEXT;
ALTER TABLE "Company" ADD COLUMN "inBusinessSince" TEXT;
ALTER TABLE "Company" ADD COLUMN "sector" TEXT;
ALTER TABLE "Company" ADD COLUMN "shippingCity" TEXT;
ALTER TABLE "Company" ADD COLUMN "shippingParish" TEXT;
ALTER TABLE "Company" ADD COLUMN "shippingStreet" TEXT;
ALTER TABLE "Company" ADD COLUMN "shippingZip" TEXT;
ALTER TABLE "Company" ADD COLUMN "taxExemptionNumber" TEXT;
ALTER TABLE "Company" ADD COLUMN "trn" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CustomerApplication" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "inquiryId" INTEGER NOT NULL,
    "companyName" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "notes" TEXT,
    "businessType" TEXT,
    "inBusinessSince" TEXT,
    "trn" TEXT,
    "taxExemptionNumber" TEXT,
    "billingStreet" TEXT,
    "billingCity" TEXT,
    "billingParish" TEXT,
    "billingZip" TEXT,
    "shippingStreet" TEXT,
    "shippingCity" TEXT,
    "shippingParish" TEXT,
    "shippingZip" TEXT,
    "principalTitle" TEXT,
    "accountingName" TEXT,
    "accountingPhone" TEXT,
    "accountingEmail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "decisionNote" TEXT,
    "decidedAt" DATETIME,
    "decidedByUserId" TEXT,
    "accountCreatedAt" DATETIME,
    "accountCreatedByUserId" TEXT,
    "companyId" INTEGER,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CustomerApplication_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CustomerApplication_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "user" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CustomerApplication_accountCreatedByUserId_fkey" FOREIGN KEY ("accountCreatedByUserId") REFERENCES "user" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CustomerApplication_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CustomerApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_CustomerApplication" ("companyId", "companyName", "contactName", "createdAt", "decidedAt", "decidedByUserId", "decisionNote", "email", "id", "industry", "inquiryId", "location", "notes", "phone", "status", "updatedAt", "userId") SELECT "companyId", "companyName", "contactName", "createdAt", "decidedAt", "decidedByUserId", "decisionNote", "email", "id", "industry", "inquiryId", "location", "notes", "phone", "status", "updatedAt", "userId" FROM "CustomerApplication";
DROP TABLE "CustomerApplication";
ALTER TABLE "new_CustomerApplication" RENAME TO "CustomerApplication";
CREATE UNIQUE INDEX "CustomerApplication_inquiryId_key" ON "CustomerApplication"("inquiryId");
CREATE INDEX "CustomerApplication_status_idx" ON "CustomerApplication"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- Legacy approvals already created their company; they are complete under the new two-step flow.
UPDATE "CustomerApplication"
SET "status" = 'ACCOUNT_CREATED',
    "accountCreatedAt" = "decidedAt",
    "accountCreatedByUserId" = "decidedByUserId"
WHERE "status" = 'APPROVED' AND "companyId" IS NOT NULL;
