-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "aboutImageAssetId" TEXT;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_aboutImageAssetId_fkey" FOREIGN KEY ("aboutImageAssetId") REFERENCES "MediaAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
