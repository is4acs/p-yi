"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  GeolocateControl,
  Layer,
  Map as MapGL,
  NavigationControl,
  Source,
} from "react-map-gl/maplibre";
import type { MapRef } from "react-map-gl/maplibre";
import { Maximize } from "lucide-react";

import {
  ACTIVITIES_SOURCE_ID,
  ActivityMapMarkers,
} from "@/components/activities/ActivityMapMarkers";
import {
  getActivityMapStyle,
  GUYANE_BOUNDS,
  OSM_RASTER_STYLE,
} from "@/components/activities/map-style";
import type { ActivityFeatureCollection } from "@/lib/activities/geojson";
import { cn } from "@/lib/utils";

/**
 * Carte MapLibre des activités. Composant à charger exclusivement via
 * `dynamic(…, { ssr: false })` : MapLibre touche `window` à l'import.
 *
 * Clustering fait par la source GeoJSON (`cluster: true`,
 * `clusterRadius: 50`) : l'île de Cayenne est très dense, l'intérieur très
 * épars. Le rendu des marqueurs/clusters est en DOM — voir
 * ActivityMapMarkers pour le raisonnement.
 */

export type MapBounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};

type Props = {
  data: ActivityFeatureCollection;
  selectedSlug: string | null;
  hoveredSlug: string | null;
  /** Clic sur un marqueur (slug) ou sur le fond de carte (null). */
  onSelect: (slug: string | null) => void;
  /** Fin de déplacement/zoom — sert à filtrer la liste sur la vue. */
  onBoundsChange?: (bounds: MapBounds) => void;
  /**
   * Gestes coopératifs : un doigt fait défiler la PAGE, deux doigts
   * déplacent la carte (molette seule = page, Ctrl + molette = zoom).
   *
   * Activé sur mobile, où la carte est un bloc au milieu d'une page qui
   * défile : sans ça, tout glissement vertical commencé sur la carte la
   * déplaçait au lieu de faire défiler la page, et on restait coincé
   * dessus. Désactivé en desktop, où la carte occupe une colonne
   * entière et où la page ne défile pas derrière elle.
   */
  cooperativeGestures?: boolean;
  className?: string;
};

export default function ActivityMap({
  data,
  selectedSlug,
  hoveredSlug,
  onSelect,
  onBoundsChange,
  cooperativeGestures = false,
  className,
}: Props) {
  const mapRef = useRef<MapRef | null>(null);
  // Repli raster si le style vectoriel ne se charge pas (fournisseur
  // injoignable, réseau filtrant). Un fond dégradé vaut mieux qu'un vide.
  const [styleFailed, setStyleFailed] = useState(false);

  const emitBounds = useCallback(() => {
    if (!onBoundsChange) return;
    const bounds = mapRef.current?.getMap().getBounds();
    if (!bounds) return;
    onBoundsChange({
      west: bounds.getWest(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      north: bounds.getNorth(),
    });
  }, [onBoundsChange]);

  // Sélection (depuis la liste OU un marqueur) → on recadre doucement sur
  // le point pour que la synchro liste → carte soit visible.
  useEffect(() => {
    if (!selectedSlug) return;
    const feature = data.features.find(
      (f) => f.properties.slug === selectedSlug,
    );
    if (!feature) return;
    mapRef.current?.getMap().easeTo({
      center: feature.geometry.coordinates,
      duration: 500,
    });
  }, [selectedSlug, data]);

  // Le mode se met à jour à la rotation / au redimensionnement, d'où le
  // pilotage impératif du handler plutôt qu'une simple option de départ :
  // MapLibre ne relit pas `cooperativeGestures` après l'initialisation.
  useEffect(() => {
    const handler = mapRef.current?.getMap().cooperativeGestures;
    if (!handler) return;
    if (cooperativeGestures) handler.enable();
    else handler.disable();
  }, [cooperativeGestures]);

  const recenter = useCallback(() => {
    mapRef.current?.getMap().fitBounds(GUYANE_BOUNDS, {
      padding: 40,
      duration: 700,
    });
  }, []);

  return (
    <div className={cn("relative h-full w-full overflow-hidden", className)}>
      <MapGL
        ref={mapRef}
        mapStyle={styleFailed ? OSM_RASTER_STYLE : getActivityMapStyle()}
        onError={(event) => {
          // MapLibre émet `error` pour tout : tuile manquante, glyphe, style.
          // On ne bascule que si c'est le STYLE lui-même qui n'a pas pu être
          // chargé — sinon une tuile absente ferait perdre le fond vectoriel.
          const message = event?.error?.message ?? "";
          if (!styleFailed && /style|sprite|glyph/i.test(message)) {
            // eslint-disable-next-line no-console
            console.warn("[carte] style vectoriel indisponible, repli OSM", message);
            setStyleFailed(true);
          }
        }}
        initialViewState={{
          bounds: GUYANE_BOUNDS,
          fitBoundsOptions: { padding: 40 },
        }}
        minZoom={4}
        maxZoom={18}
        cooperativeGestures={cooperativeGestures}
        style={{ width: "100%", height: "100%" }}
        onLoad={emitBounds}
        onMoveEnd={emitBounds}
        onClick={() => onSelect(null)}
      >
        <Source
          id={ACTIVITIES_SOURCE_ID}
          type="geojson"
          data={data}
          cluster
          clusterRadius={50}
          clusterMaxZoom={13}
        >
          {/*
            Couche technique, volontairement invisible.

            MapLibre ne découpe une source GeoJSON en tuiles que si AU MOINS
            UNE couche la référence. Sans cette couche, la source existe mais
            n'est jamais tuilée : `querySourceFeatures()` renvoie un tableau
            vide et aucun marqueur n'apparaît — la carte s'affiche, mais nue.

            Les marqueurs et les compteurs de clusters visibles restent rendus
            en DOM par ActivityMapMarkers (zone de tap 44px, emoji, halo en
            tokens Tailwind, zéro dépendance à un serveur de glyphs). Cette
            couche ne sert donc qu'à déclencher le tuilage : rayon et opacité
            à zéro. Ne pas la passer en `visibility: "none"` — une couche
            masquée ne charge pas ses tuiles et le bug reviendrait.
          */}
          <Layer
            id="activities-tiling-anchor"
            type="circle"
            paint={{
              "circle-radius": 0,
              "circle-opacity": 0,
              "circle-stroke-width": 0,
            }}
          />
        </Source>
        <NavigationControl position="top-right" showCompass={false} />
        <GeolocateControl
          position="top-right"
          positionOptions={{ enableHighAccuracy: true }}
          trackUserLocation={false}
          showUserLocation
        />
        <ActivityMapMarkers
          selectedSlug={selectedSlug}
          hoveredSlug={hoveredSlug}
          onSelect={onSelect}
        />
      </MapGL>

      {/* Recentrage Guyane entière — bouton custom (pas de contrôle
          MapLibre natif pour ça), zone de tap 44px. */}
      <button
        type="button"
        onClick={recenter}
        title="Recentrer sur la Guyane"
        aria-label="Recentrer la carte sur la Guyane entière"
        className="absolute left-2.5 top-2.5 flex h-11 w-11 items-center justify-center rounded-md border border-border bg-background/95 text-foreground shadow-sm backdrop-blur transition hover:bg-accent active:scale-95"
      >
        <Maximize className="h-5 w-5" aria-hidden />
      </button>
    </div>
  );
}
