-- AlterTable
ALTER TABLE "InquiryItem" ADD COLUMN "dealLabel" TEXT;

-- CreateTable
CREATE TABLE "Deal" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "percentOff" INTEGER,
    "badgeText" TEXT,
    "description" TEXT,
    "productId" INTEGER NOT NULL,
    "variantId" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "endsAt" DATETIME,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Deal_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Deal_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Deal_productId_idx" ON "Deal"("productId");
