import type { StyleSpecification } from "maplibre-gl";

import { env } from "@/lib/env";

/**
 * Cadrage et style de la carte des activités.
 *
 * Le style vient de `NEXT_PUBLIC_MAP_STYLE_URL` (style vectoriel MapLibre,
 * fournisseur au choix) avec un fallback raster OpenStreetMap : la carte
 * fonctionne donc sans aucune clé ni compte tiers. Changer de fournisseur
 * = changer la variable d'env, zéro code.
 */

/** Bbox Guyane entière [ouest, sud, est, nord]. */
export const GUYANE_BOUNDS: [[number, number], [number, number]] = [
  [-54.6, 2.1],
  [-51.6, 5.8],
];

export const GUYANE_CENTER = { longitude: -52.9, latitude: 4.2 } as const;
export const GUYANE_DEFAULT_ZOOM = 7;

/**
 * Fallback sans clé : tuiles raster OSM. Pas de couche texte → pas de
 * glyphs à charger (les compteurs de clusters sont rendus en DOM, cf.
 * ActivityMapMarkers), donc aucune dépendance à un serveur de fonts.
 */
const OSM_RASTER_STYLE: StyleSpecification = {
  version: 8,
  name: "Péyi fallback OSM",
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      maxzoom: 19,
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    },
  },
  layers: [
    // Fond neutre visible pendant le chargement des tuiles — teinte
    // "paper" du design system pour éviter un flash blanc/gris froid.
    { id: "background", type: "background", paint: { "background-color": "#FFFBF5" } },
    { id: "osm", type: "raster", source: "osm" },
  ],
};

export function getActivityMapStyle(): string | StyleSpecification {
  return env.NEXT_PUBLIC_MAP_STYLE_URL ?? OSM_RASTER_STYLE;
}
