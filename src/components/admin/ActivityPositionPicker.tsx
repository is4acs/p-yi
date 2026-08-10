"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { useRef } from "react";
import { Map as MapGL, Marker } from "react-map-gl/maplibre";
import type { MapRef } from "react-map-gl/maplibre";
import type { MapLayerMouseEvent } from "maplibre-gl";
import { MapPin } from "lucide-react";

import {
  getActivityMapStyle,
  GUYANE_BOUNDS,
} from "@/components/activities/map-style";

/**
 * Mini-carte de positionnement pour le formulaire admin : on clique ou on
 * déplace le marqueur, ça remplit lat/lng — personne ne tape des
 * coordonnées à la main. À charger via dynamic ssr:false (MapLibre).
 */

type Props = {
  latitude: number | null;
  longitude: number | null;
  onChange: (position: { latitude: number; longitude: number }) => void;
};

export default function ActivityPositionPicker({
  latitude,
  longitude,
  onChange,
}: Props) {
  const mapRef = useRef<MapRef | null>(null);
  const hasPosition = latitude !== null && longitude !== null;

  const handleClick = (event: MapLayerMouseEvent) => {
    onChange({
      latitude: Number(event.lngLat.lat.toFixed(6)),
      longitude: Number(event.lngLat.lng.toFixed(6)),
    });
  };

  return (
    <div className="relative h-80 w-full overflow-hidden rounded-md border border-border">
      <MapGL
        ref={mapRef}
        mapStyle={getActivityMapStyle()}
        initialViewState={
          hasPosition
            ? { latitude: latitude, longitude: longitude, zoom: 11 }
            : { bounds: GUYANE_BOUNDS, fitBoundsOptions: { padding: 24 } }
        }
        minZoom={4}
        maxZoom={18}
        style={{ width: "100%", height: "100%" }}
        onClick={handleClick}
        cursor="crosshair"
      >
        {hasPosition && (
          <Marker
            latitude={latitude}
            longitude={longitude}
            anchor="bottom"
            draggable
            onDragEnd={(event) =>
              onChange({
                latitude: Number(event.lngLat.lat.toFixed(6)),
                longitude: Number(event.lngLat.lng.toFixed(6)),
              })
            }
          >
            <MapPin
              className="h-8 w-8 fill-peyi-orange-500 text-peyi-orange-700 drop-shadow"
              aria-hidden
            />
          </Marker>
        )}
      </MapGL>
      <p className="pointer-events-none absolute inset-x-0 bottom-0 bg-ink-900/70 px-3 py-1.5 text-center text-xs text-white">
        {hasPosition
          ? "Glisse le marqueur ou clique pour repositionner"
          : "Clique sur la carte pour placer le lieu"}
      </p>
    </div>
  );
}
