-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AdminActionType" ADD VALUE 'CREATE_ACTIVITY';
ALTER TYPE "AdminActionType" ADD VALUE 'UPDATE_ACTIVITY';
ALTER TYPE "AdminActionType" ADD VALUE 'DELETE_ACTIVITY';
ALTER TYPE "AdminActionType" ADD VALUE 'SET_ACTIVITY_STATUS';

-- AlterEnum
ALTER TYPE "AdminTargetType" ADD VALUE 'ACTIVITY';

