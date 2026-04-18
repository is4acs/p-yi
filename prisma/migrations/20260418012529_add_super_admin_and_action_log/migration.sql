-- CreateEnum
CREATE TYPE "AdminActionType" AS ENUM ('DELETE_LISTING', 'DELETE_DEAL', 'DELETE_COMMENT', 'DELETE_MESSAGE', 'BAN_USER', 'UNBAN_USER', 'SHADOW_BAN_USER', 'UNSHADOW_BAN_USER', 'SET_ROLE', 'RESOLVE_REPORT', 'DISMISS_REPORT');

-- CreateEnum
CREATE TYPE "AdminTargetType" AS ENUM ('LISTING', 'DEAL', 'COMMENT', 'MESSAGE', 'USER', 'REPORT');

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'SUPER_ADMIN';

-- CreateTable
CREATE TABLE "admin_action_logs" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" "AdminActionType" NOT NULL,
    "targetType" "AdminTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_action_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_action_logs_adminId_createdAt_idx" ON "admin_action_logs"("adminId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "admin_action_logs_action_createdAt_idx" ON "admin_action_logs"("action", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "admin_action_logs_targetType_targetId_idx" ON "admin_action_logs"("targetType", "targetId");

-- AddForeignKey
ALTER TABLE "admin_action_logs" ADD CONSTRAINT "admin_action_logs_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
