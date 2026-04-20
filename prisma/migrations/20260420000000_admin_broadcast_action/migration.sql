-- Ajoute la valeur BROADCAST_NOTIFICATION à l'enum AdminActionType
-- et SYSTEM à AdminTargetType pour pouvoir logger les broadcasts
-- globaux (audience massive) dans AdminActionLog.
--
-- Postgres exige que `ALTER TYPE ... ADD VALUE` ne soit PAS dans une
-- transaction avec d'autres commandes qui consomment la nouvelle valeur
-- juste après. Ici on ajoute juste deux valeurs — pas de SELECT/INSERT
-- derrière — donc Prisma (qui wrap chaque migration dans une tx) passera
-- sans problème.

ALTER TYPE "AdminActionType" ADD VALUE IF NOT EXISTS 'BROADCAST_NOTIFICATION';
ALTER TYPE "AdminTargetType" ADD VALUE IF NOT EXISTS 'SYSTEM';
