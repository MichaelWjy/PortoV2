-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN     "certificationsHeadline" TEXT NOT NULL DEFAULT 'Certifications.';

-- CreateTable
CREATE TABLE "Certification" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "issueDate" DATE,
    "expiryDate" DATE,
    "credentialId" TEXT,
    "credentialUrl" TEXT,
    "description" TEXT,
    "imageAssetId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Certification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Certification_status_sortOrder_idx" ON "Certification"("status", "sortOrder");

-- AddForeignKey
ALTER TABLE "Certification" ADD CONSTRAINT "Certification_imageAssetId_fkey" FOREIGN KEY ("imageAssetId") REFERENCES "MediaAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
