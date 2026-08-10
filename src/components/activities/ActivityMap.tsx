"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { useCallback, useEffect, useRef } from "react";
import {
  GeolocateControl,
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
  className?: string;
};

export default function ActivityMap({
  data,
  selectedSlug,
  hoveredSlug,
  onSelect,
  onBoundsChange,
  className,
}: Props) {
  const mapRef = useRef<MapRef | null>(null);

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
        mapStyle={getActivityMapStyle()}
        initialViewState={{
          bounds: GUYANE_BOUNDS,
          fitBoundsOptions: { padding: 40 },
        }}
        minZoom={4}
        maxZoom={18}
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
        />
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
