-- AlterTable
ALTER TABLE "CurtainCategory" ADD COLUMN "seoCanonicalUrl" TEXT;
ALTER TABLE "CurtainCategory" ADD COLUMN "seoDescription" TEXT;
ALTER TABLE "CurtainCategory" ADD COLUMN "seoOgDescription" TEXT;
ALTER TABLE "CurtainCategory" ADD COLUMN "seoOgImage" TEXT;
ALTER TABLE "CurtainCategory" ADD COLUMN "seoOgTitle" TEXT;
ALTER TABLE "CurtainCategory" ADD COLUMN "seoRobots" TEXT;
ALTER TABLE "CurtainCategory" ADD COLUMN "seoTitle" TEXT;
ALTER TABLE "CurtainCategory" ADD COLUMN "seoTwitterCard" TEXT;
ALTER TABLE "CurtainCategory" ADD COLUMN "seoTwitterDescription" TEXT;
ALTER TABLE "CurtainCategory" ADD COLUMN "seoTwitterImage" TEXT;
ALTER TABLE "CurtainCategory" ADD COLUMN "seoTwitterTitle" TEXT;

-- AlterTable
ALTER TABLE "CurtainModel" ADD COLUMN "seoCanonicalUrl" TEXT;
ALTER TABLE "CurtainModel" ADD COLUMN "seoDescription" TEXT;
ALTER TABLE "CurtainModel" ADD COLUMN "seoOgDescription" TEXT;
ALTER TABLE "CurtainModel" ADD COLUMN "seoOgImage" TEXT;
ALTER TABLE "CurtainModel" ADD COLUMN "seoOgTitle" TEXT;
ALTER TABLE "CurtainModel" ADD COLUMN "seoRobots" TEXT;
ALTER TABLE "CurtainModel" ADD COLUMN "seoTitle" TEXT;
ALTER TABLE "CurtainModel" ADD COLUMN "seoTwitterCard" TEXT;
ALTER TABLE "CurtainModel" ADD COLUMN "seoTwitterDescription" TEXT;
ALTER TABLE "CurtainModel" ADD COLUMN "seoTwitterImage" TEXT;
ALTER TABLE "CurtainModel" ADD COLUMN "seoTwitterTitle" TEXT;

-- AlterTable
ALTER TABLE "PortfolioCategory" ADD COLUMN "seoCanonicalUrl" TEXT;
ALTER TABLE "PortfolioCategory" ADD COLUMN "seoDescription" TEXT;
ALTER TABLE "PortfolioCategory" ADD COLUMN "seoOgDescription" TEXT;
ALTER TABLE "PortfolioCategory" ADD COLUMN "seoOgImage" TEXT;
ALTER TABLE "PortfolioCategory" ADD COLUMN "seoOgTitle" TEXT;
ALTER TABLE "PortfolioCategory" ADD COLUMN "seoRobots" TEXT;
ALTER TABLE "PortfolioCategory" ADD COLUMN "seoTitle" TEXT;
ALTER TABLE "PortfolioCategory" ADD COLUMN "seoTwitterCard" TEXT;
ALTER TABLE "PortfolioCategory" ADD COLUMN "seoTwitterDescription" TEXT;
ALTER TABLE "PortfolioCategory" ADD COLUMN "seoTwitterImage" TEXT;
ALTER TABLE "PortfolioCategory" ADD COLUMN "seoTwitterTitle" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "seoCanonicalUrl" TEXT;
ALTER TABLE "Product" ADD COLUMN "seoDescription" TEXT;
ALTER TABLE "Product" ADD COLUMN "seoOgDescription" TEXT;
ALTER TABLE "Product" ADD COLUMN "seoOgImage" TEXT;
ALTER TABLE "Product" ADD COLUMN "seoOgTitle" TEXT;
ALTER TABLE "Product" ADD COLUMN "seoRobots" TEXT;
ALTER TABLE "Product" ADD COLUMN "seoTitle" TEXT;
ALTER TABLE "Product" ADD COLUMN "seoTwitterCard" TEXT;
ALTER TABLE "Product" ADD COLUMN "seoTwitterDescription" TEXT;
ALTER TABLE "Product" ADD COLUMN "seoTwitterImage" TEXT;
ALTER TABLE "Product" ADD COLUMN "seoTwitterTitle" TEXT;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN "seoCanonicalUrl" TEXT;
ALTER TABLE "Project" ADD COLUMN "seoDescription" TEXT;
ALTER TABLE "Project" ADD COLUMN "seoOgDescription" TEXT;
ALTER TABLE "Project" ADD COLUMN "seoOgImage" TEXT;
ALTER TABLE "Project" ADD COLUMN "seoOgTitle" TEXT;
ALTER TABLE "Project" ADD COLUMN "seoRobots" TEXT;
ALTER TABLE "Project" ADD COLUMN "seoTitle" TEXT;
ALTER TABLE "Project" ADD COLUMN "seoTwitterCard" TEXT;
ALTER TABLE "Project" ADD COLUMN "seoTwitterDescription" TEXT;
ALTER TABLE "Project" ADD COLUMN "seoTwitterImage" TEXT;
ALTER TABLE "Project" ADD COLUMN "seoTwitterTitle" TEXT;

-- AlterTable
ALTER TABLE "ShopCategory" ADD COLUMN "seoCanonicalUrl" TEXT;
ALTER TABLE "ShopCategory" ADD COLUMN "seoDescription" TEXT;
ALTER TABLE "ShopCategory" ADD COLUMN "seoOgDescription" TEXT;
ALTER TABLE "ShopCategory" ADD COLUMN "seoOgImage" TEXT;
ALTER TABLE "ShopCategory" ADD COLUMN "seoOgTitle" TEXT;
ALTER TABLE "ShopCategory" ADD COLUMN "seoRobots" TEXT;
ALTER TABLE "ShopCategory" ADD COLUMN "seoTitle" TEXT;
ALTER TABLE "ShopCategory" ADD COLUMN "seoTwitterCard" TEXT;
ALTER TABLE "ShopCategory" ADD COLUMN "seoTwitterDescription" TEXT;
ALTER TABLE "ShopCategory" ADD COLUMN "seoTwitterImage" TEXT;
ALTER TABLE "ShopCategory" ADD COLUMN "seoTwitterTitle" TEXT;

-- CreateTable
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "coverImage" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "seoCanonicalUrl" TEXT,
    "seoRobots" TEXT,
    "seoOgTitle" TEXT,
    "seoOgDescription" TEXT,
    "seoOgImage" TEXT,
    "seoTwitterCard" TEXT,
    "seoTwitterTitle" TEXT,
    "seoTwitterDescription" TEXT,
    "seoTwitterImage" TEXT
);

-- CreateTable
CREATE TABLE "CollectionProduct" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "collectionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CollectionProduct_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CollectionProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CollectionCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "collectionId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CollectionCategory_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CollectionCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "CurtainCategory" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CollectionProject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "collectionId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CollectionProject_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CollectionProject_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "storagePath" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "webpUrl" TEXT,
    "webpSize" INTEGER,
    "originalSize" INTEGER,
    "originalMimeType" TEXT,
    "sha256" TEXT,
    "alt" TEXT,
    "caption" TEXT,
    "title" TEXT,
    "uploadedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Media_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MediaUsage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mediaId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MediaUsage_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SiteSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL DEFAULT 'main',
    "logoUrl" TEXT,
    "heroSlides" TEXT,
    "pageHeroes" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "seoKeywords" TEXT,
    "canonicalUrl" TEXT,
    "robotsPolicy" TEXT,
    "ogTitle" TEXT,
    "ogDescription" TEXT,
    "ogImage" TEXT,
    "twitterCard" TEXT,
    "twitterTitle" TEXT,
    "twitterDescription" TEXT,
    "twitterImage" TEXT,
    "organizationName" TEXT,
    "organizationLogo" TEXT,
    "sitemapEnabled" BOOLEAN NOT NULL DEFAULT true,
    "verificationGoogle" TEXT,
    "verificationBing" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_SiteSetting" ("createdAt", "heroSlides", "id", "key", "logoUrl", "pageHeroes", "updatedAt") SELECT "createdAt", "heroSlides", "id", "key", "logoUrl", "pageHeroes", "updatedAt" FROM "SiteSetting";
DROP TABLE "SiteSetting";
ALTER TABLE "new_SiteSetting" RENAME TO "SiteSetting";
CREATE UNIQUE INDEX "SiteSetting_key_key" ON "SiteSetting"("key");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Collection_slug_key" ON "Collection"("slug");

-- CreateIndex
CREATE INDEX "Collection_active_order_idx" ON "Collection"("active", "order");

-- CreateIndex
CREATE INDEX "Collection_slug_idx" ON "Collection"("slug");

-- CreateIndex
CREATE INDEX "CollectionProduct_collectionId_idx" ON "CollectionProduct"("collectionId");

-- CreateIndex
CREATE INDEX "CollectionProduct_productId_idx" ON "CollectionProduct"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionProduct_collectionId_productId_key" ON "CollectionProduct"("collectionId", "productId");

-- CreateIndex
CREATE INDEX "CollectionCategory_collectionId_idx" ON "CollectionCategory"("collectionId");

-- CreateIndex
CREATE INDEX "CollectionCategory_categoryId_idx" ON "CollectionCategory"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionCategory_collectionId_categoryId_key" ON "CollectionCategory"("collectionId", "categoryId");

-- CreateIndex
CREATE INDEX "CollectionProject_collectionId_idx" ON "CollectionProject"("collectionId");

-- CreateIndex
CREATE INDEX "CollectionProject_projectId_idx" ON "CollectionProject"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionProject_collectionId_projectId_key" ON "CollectionProject"("collectionId", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Media_sha256_key" ON "Media"("sha256");

-- CreateIndex
CREATE INDEX "Media_uploadedById_idx" ON "Media"("uploadedById");

-- CreateIndex
CREATE INDEX "Media_sha256_idx" ON "Media"("sha256");

-- CreateIndex
CREATE INDEX "Media_mimeType_idx" ON "Media"("mimeType");

-- CreateIndex
CREATE INDEX "Media_createdAt_idx" ON "Media"("createdAt");

-- CreateIndex
CREATE INDEX "Media_url_idx" ON "Media"("url");

-- CreateIndex
CREATE INDEX "Media_webpUrl_idx" ON "Media"("webpUrl");

-- CreateIndex
CREATE INDEX "MediaUsage_mediaId_idx" ON "MediaUsage"("mediaId");

-- CreateIndex
CREATE INDEX "MediaUsage_entityType_entityId_idx" ON "MediaUsage"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "MediaUsage_entityType_entityId_fieldName_idx" ON "MediaUsage"("entityType", "entityId", "fieldName");

-- CreateIndex
CREATE UNIQUE INDEX "MediaUsage_mediaId_entityType_entityId_fieldName_key" ON "MediaUsage"("mediaId", "entityType", "entityId", "fieldName");
