import { UserLevel } from "@prisma/client";

// Seuils en karma pour chaque niveau. Les valeurs matchent la documentation
// du schéma Prisma (BEGINNER 0 → AMBASSADOR 5000). Ordre croissant : c'est
// ce qui permet à `computeLevel` de scanner du plus haut au plus bas et de
// retourner le premier niveau atteint.
export const LEVEL_THRESHOLDS: Array<{ level: UserLevel; min: number }> = [
  { level: UserLevel.AMBASSADOR, min: 5000 },
  { level: UserLevel.LEGEND, min: 2000 },
  { level: UserLevel.EXPERT, min: 500 },
  { level: UserLevel.HUNTER, min: 200 },
  { level: UserLevel.CURIOUS, min: 50 },
  { level: UserLevel.BEGINNER, min: 0 },
];

export const LEVEL_META: Record<
  UserLevel,
  { emoji: string; label: string; tagline: string; minKarma: number }
> = {
  BEGINNER: {
    emoji: "🌱",
    label: "Débutant",
    tagline: "Bienvenue sur Péyi ! Commence à partager des bons plans.",
    minKarma: 0,
  },
  CURIOUS: {
    emoji: "🦎",
    label: "Curieux",
    tagline: "Tu prends tes marques. Continue à contribuer !",
    minKarma: 50,
  },
  HUNTER: {
    emoji: "🔥",
    label: "Chasseur",
    tagline: "Tu déniches les meilleures offres de Guyane.",
    minKarma: 200,
  },
  EXPERT: {
    emoji: "⚡",
    label: "Expert",
    tagline: "Ton avis compte dans la communauté.",
    minKarma: 500,
  },
  LEGEND: {
    emoji: "👑",
    label: "Légende",
    tagline: "Une référence du bon plan guyanais.",
    minKarma: 2000,
  },
  AMBASSADOR: {
    emoji: "🏆",
    label: "Ambassadeur",
    tagline: "Tu fais vivre Péyi au quotidien. Respect.",
    minKarma: 5000,
  },
};

export function computeLevel(karma: number): UserLevel {
  for (const { level, min } of LEVEL_THRESHOLDS) {
    if (karma >= min) return level;
  }
  return UserLevel.BEGINNER;
}

// Renvoie le niveau juste supérieur, ou `null` si l'utilisateur est déjà
// au plafond. Les seuils sont scannés du plus bas au plus haut pour trouver
// le premier `min` strictement supérieur au karma courant.
export function nextLevel(
  karma: number,
): { level: UserLevel; min: number } | null {
  const ascending = [...LEVEL_THRESHOLDS].reverse();
  for (const entry of ascending) {
    if (entry.min > karma) return entry;
  }
  return null;
}

export type LevelProgress = {
  current: UserLevel;
  currentMin: number;
  next: UserLevel | null;
  nextMin: number | null;
  // Pourcentage de 0 à 100 sur la tranche actuelle. 100 si déjà au max.
  percent: number;
  karmaToNext: number;
};

export function levelProgress(karma: number): LevelProgress {
  const current = computeLevel(karma);
  const currentMin = LEVEL_META[current].minKarma;
  const next = nextLevel(karma);
  if (!next) {
    return {
      current,
      currentMin,
      next: null,
      nextMin: null,
      percent: 100,
      karmaToNext: 0,
    };
  }
  const range = next.min - currentMin;
  const reached = karma - currentMin;
  const percent = range > 0 ? Math.round((reached / range) * 100) : 0;
  return {
    current,
    currentMin,
    next: next.level,
    nextMin: next.min,
    percent: Math.max(0, Math.min(100, percent)),
    karmaToNext: Math.max(0, next.min - karma),
  };
}
