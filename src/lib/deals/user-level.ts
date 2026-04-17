import type { UserLevel } from "@prisma/client";

export const LEVEL_META: Record<UserLevel, { emoji: string; label: string }> = {
  BEGINNER: { emoji: "🌱", label: "Débutant" },
  CURIOUS: { emoji: "🦎", label: "Curieux" },
  HUNTER: { emoji: "🔥", label: "Chasseur" },
  EXPERT: { emoji: "⚡", label: "Expert" },
  LEGEND: { emoji: "👑", label: "Légende" },
  AMBASSADOR: { emoji: "🏆", label: "Ambassadeur" },
};
