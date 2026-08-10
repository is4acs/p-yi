-- CreateEnum
CREATE TYPE "ActivityCategory" AS ENUM ('NATURE', 'WILDLIFE', 'CULTURE', 'HERITAGE', 'SPACE', 'NAUTICAL', 'ADVENTURE', 'GASTRONOMY', 'WELLNESS', 'FAMILY');

-- CreateEnum
CREATE TYPE "AccessMode" AS ENUM ('CAR', 'TRACK', 'FOUR_WHEEL_DRIVE', 'PIROGUE', 'BOAT', 'PLANE', 'WALK');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MODERATE', 'HARD', 'EXPERT');

-- CreateEnum
CREATE TYPE "Season" AS ENUM ('MAIN_DRY_SEASON', 'SHORT_DRY_SEASON', 'RAINY_SEASON', 'ALL_YEAR');

-- CreateEnum
CREATE TYPE "ActivityStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'HIDDEN');

-- CreateTable
CREATE TABLE "activities" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "ActivityCategory" NOT NULL,
    "tags" TEXT[],
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "cityId" TEXT NOT NULL,
    "address" TEXT,
    "startPoint" TEXT,
    "accessModes" "AccessMode"[],
    "durationMinutes" INTEGER,
    "difficulty" "Difficulty",
    "seasons" "Season"[],
    "accessNote" TEXT,
    "priceMinCents" INTEGER,
    "priceMaxCents" INTEGER,
    "isFree" BOOLEAN NOT NULL DEFAULT false,
    "bookingRequired" BOOLEAN NOT NULL DEFAULT false,
    "bookingUrl" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "website" TEXT,
    "instagram" TEXT,
    "openingHours" JSONB,
    "operatorId" TEXT,
    "status" "ActivityStatus" NOT NULL DEFAULT 'DRAFT',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_images" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "altText" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operators" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operators_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "activities_slug_key" ON "activities"("slug");

-- CreateIndex
CREATE INDEX "activities_status_category_idx" ON "activities"("status", "category");

-- CreateIndex
CREATE INDEX "activities_latitude_longitude_idx" ON "activities"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "activities_cityId_status_idx" ON "activities"("cityId", "status");

-- CreateIndex
CREATE INDEX "activities_operatorId_idx" ON "activities"("operatorId");

-- CreateIndex
CREATE INDEX "activity_images_activityId_sortOrder_idx" ON "activity_images"("activityId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "operators_slug_key" ON "operators"("slug");

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "operators"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_images" ADD CONSTRAINT "activity_images_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

