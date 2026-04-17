-- AlterTable
ALTER TABLE "listings" ADD COLUMN     "attrBrand" TEXT,
ADD COLUMN     "attrContract" TEXT,
ADD COLUMN     "attrFuel" TEXT,
ADD COLUMN     "attrMileageKm" INTEGER,
ADD COLUMN     "attrRooms" SMALLINT,
ADD COLUMN     "attrSurfaceM2" SMALLINT,
ADD COLUMN     "attrYear" SMALLINT;

-- CreateIndex
CREATE INDEX "listings_attrYear_idx" ON "listings"("attrYear");

-- CreateIndex
CREATE INDEX "listings_attrMileageKm_idx" ON "listings"("attrMileageKm");

-- CreateIndex
CREATE INDEX "listings_attrSurfaceM2_idx" ON "listings"("attrSurfaceM2");

-- CreateIndex
CREATE INDEX "listings_attrRooms_idx" ON "listings"("attrRooms");

-- CreateIndex
CREATE INDEX "listings_attrBrand_idx" ON "listings"("attrBrand");

-- CreateIndex
CREATE INDEX "listings_attrFuel_idx" ON "listings"("attrFuel");

-- CreateIndex
CREATE INDEX "listings_attrContract_idx" ON "listings"("attrContract");
