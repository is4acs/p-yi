import type { StyleSpecification } from "maplibre-gl";

import { env } from "@/lib/env";

/**
 * Cadrage et fond de carte des activités.
 *
 * Par défaut on utilise un style VECTORIEL sans clé ni compte (OpenFreeMap) :
 * rendu net, labels lisibles, zoom fluide, et surtout beaucoup plus sobre que
 * des tuiles raster OSM brutes — c'est le rendu attendu par les utilisateurs
 * d'applications locales.
 *
 * Trois niveaux, dans l'ordre de priorité :
 *   1. `NEXT_PUBLIC_MAP_STYLE_URL` si elle est définie (MapTiler, Stadia,
 *      Protomaps auto-hébergé…) — permet de changer de fournisseur sans
 *      toucher au code ;
 *   2. OpenFreeMap « liberty », le défaut ;
 *   3. tuiles raster OSM, utilisées automatiquement par `ActivityMap` si le
 *      style vectoriel ne se charge pas (fournisseur injoignable, réseau
 *      d'entreprise filtrant…). Mieux vaut une carte moche qu'un écran vide.
 *
 * Toute origine ajoutée ici doit l'être aussi dans la CSP `connect-src`
 * (cf. `mapHosts()` dans next.config.mjs), sinon le navigateur bloque le
 * chargement du style, des tuiles et des glyphes.
 */

/** Bbox Guyane entière [ouest, sud, est, nord]. */
export const GUYANE_BOUNDS: [[number, number], [number, number]] = [
  [-54.6, 2.1],
  [-51.6, 5.8],
];

export const GUYANE_CENTER = { longitude: -52.9, latitude: 4.2 } as const;
export const GUYANE_DEFAULT_ZOOM = 7;

/** Style vectoriel par défaut — gratuit, sans clé ni inscription. */
export const DEFAULT_VECTOR_STYLE_URL =
  "https://tiles.openfreemap.org/styles/liberty";

/**
 * Repli raster sans dépendance à un serveur de styles ou de glyphes. Pas de
 * couche texte : les libellés de la carte disparaissent, mais les marqueurs
 * (rendus en DOM) et la navigation restent parfaitement utilisables.
 */
export const OSM_RASTER_STYLE: StyleSpecification = {
  version: 8,
  name: "Péyi — repli OSM",
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
    // Fond neutre visible pendant le chargement des tuiles — teinte "paper"
    // du design system, pour éviter un flash blanc/gris froid.
    {
      id: "background",
      type: "background",
      paint: { "background-color": "#FFFBF5" },
    },
    { id: "osm", type: "raster", source: "osm" },
  ],
};

export function getActivityMapStyle(): string {
  return env.NEXT_PUBLIC_MAP_STYLE_URL ?? DEFAULT_VECTOR_STYLE_URL;
}
