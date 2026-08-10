import type {
  AccessMode,
  ActivityCategory,
  Difficulty,
  Season,
} from "@prisma/client";

import type { ActivityMapRow } from "@/lib/activities/queries";

/**
 * Contrat GeoJSON de la carte, partagé entre la route
 * `/api/activites/geojson` (serveur) et le composant carte (client).
 *
 * Les propriétés restent volontairement minces (pas de description, pas de
 * galerie — juste le thumb) : le détail complet se charge au clic via
 * `/api/activites/[slug]`. On embarque en revanche les enums de filtrage
 * (accès, saisons, difficulté, durée, commune) : quelques octets par point
 * qui permettent de filtrer 100 % côté client, donc UN SEUL fetch même en
 * 3G — le compromis inverse (refetch serveur à chaque filtre) serait pire
 * sur le réseau mobile guyanais.
 */

export type ActivityFeatureProperties = {
  id: string;
  slug: string;
  name: string;
  category: ActivityCategory;
  priceMinCents: number | null;
  isFree: boolean;
  thumbUrl: string | null;
  citySlug: string;
  cityName: string;
  accessModes: AccessMode[];
  seasons: Season[];
  difficulty: Difficulty | null;
  durationMinutes: number | null;
};

export type ActivityFeature = {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: ActivityFeatureProperties;
};

export type ActivityFeatureCollection = {
  type: "FeatureCollection";
  features: ActivityFeature[];
};

export function buildActivityFeatureCollection(
  rows: ActivityMapRow[],
): ActivityFeatureCollection {
  return {
    type: "FeatureCollection",
    features: rows.map((row) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        // GeoJSON = [longitude, latitude], pas l'inverse.
        coordinates: [row.longitude, row.latitude],
      },
      properties: {
        id: row.id,
        slug: row.slug,
        name: row.name,
        category: row.category,
        priceMinCents: row.priceMinCents,
        isFree: row.isFree,
        thumbUrl: row.images[0]?.url ?? null,
        citySlug: row.city.slug,
        cityName: row.city.name,
        accessModes: row.accessModes,
        seasons: row.seasons,
        difficulty: row.difficulty,
        durationMinutes: row.durationMinutes,
      },
    })),
  };
}

export const EMPTY_ACTIVITY_COLLECTION: ActivityFeatureCollection = {
  type: "FeatureCollection",
  features: [],
};
