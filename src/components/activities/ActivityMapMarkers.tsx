"use client";

import { useCallback, useEffect, useState } from "react";
import { Marker, useMap } from "react-map-gl/maplibre";
import type { GeoJSONSource } from "maplibre-gl";
import type { ActivityCategory } from "@prisma/client";

import { ACTIVITY_CATEGORIES } from "@/lib/activities/labels";
import { cn } from "@/lib/utils";

export const ACTIVITIES_SOURCE_ID = "activities";

/**
 * Marqueurs de la carte (points + clusters) rendus en DOM via `<Marker>`,
 * alimentés par `querySourceFeatures` sur la source GeoJSON clusterisée.
 *
 * Pourquoi du DOM plutôt que des layers circle/symbol MapLibre :
 *  - les compteurs de clusters en HTML ne dépendent d'aucun serveur de
 *    glyphs → le style de fond reste interchangeable (env var) sans se
 *    soucier des fonts embarquées par le fournisseur ;
 *  - zone de tap garantie ≥ 44px et états hover/sélection stylables en
 *    Tailwind (halo orange, élévation) sans dupliquer les tokens en
 *    expressions de paint ;
 *  - après clustering il reste rarement plus de ~80 marqueurs visibles,
 *    très loin du seuil où le DOM devient un problème de perf.
 *
 * On ne se resynchronise que sur `moveend`/`zoomend`/`sourcedata`/`idle` :
 * pendant un pan, les `<Marker>` suivent la caméra tout seuls.
 */

type ClusterMarkerData = {
  key: string;
  longitude: number;
  latitude: number;
  clusterId: number;
  count: number;
};

type PointMarkerData = {
  key: string;
  longitude: number;
  latitude: number;
  slug: string;
  name: string;
  category: ActivityCategory;
};

type Props = {
  selectedSlug: string | null;
  hoveredSlug: string | null;
  onSelect: (slug: string) => void;
};

export function ActivityMapMarkers({ selectedSlug, hoveredSlug, onSelect }: Props) {
  const { current: mapRef } = useMap();
  const [clusters, setClusters] = useState<ClusterMarkerData[]>([]);
  const [points, setPoints] = useState<PointMarkerData[]>([]);

  useEffect(() => {
    if (!mapRef) return;
    const map = mapRef.getMap();

    const update = () => {
      if (!map.getSource(ACTIVITIES_SOURCE_ID)) return;
      const rendered = map.querySourceFeatures(ACTIVITIES_SOURCE_ID);

      // Les tuiles adjacentes dupliquent les features → dédupe par id.
      const seen = new Set<string>();
      const nextClusters: ClusterMarkerData[] = [];
      const nextPoints: PointMarkerData[] = [];

      for (const feature of rendered) {
        if (feature.geometry.type !== "Point") continue;
        const [longitude, latitude] = feature.geometry.coordinates as [
          number,
          number,
        ];
        const props = feature.properties ?? {};

        if (props.cluster) {
          const clusterId = Number(props.cluster_id);
          const key = `c:${clusterId}`;
          if (seen.has(key)) continue;
          seen.add(key);
          nextClusters.push({
            key,
            longitude,
            latitude,
            clusterId,
            count: Number(props.point_count ?? 0),
          });
        } else {
          const slug = String(props.slug ?? "");
          if (!slug) continue;
          const key = `p:${slug}`;
          if (seen.has(key)) continue;
          seen.add(key);
          nextPoints.push({
            key,
            longitude,
            latitude,
            slug,
            name: String(props.name ?? ""),
            category: props.category as ActivityCategory,
          });
        }
      }

      // Ordre stable pour éviter de démonter/remonter les <Marker>.
      nextClusters.sort((a, b) => a.key.localeCompare(b.key));
      nextPoints.sort((a, b) => a.key.localeCompare(b.key));
      setClusters(nextClusters);
      setPoints(nextPoints);
    };

    map.on("moveend", update);
    map.on("zoomend", update);
    map.on("sourcedata", update);
    map.on("idle", update);
    update();

    return () => {
      map.off("moveend", update);
      map.off("zoomend", update);
      map.off("sourcedata", update);
      map.off("idle", update);
    };
  }, [mapRef]);

  const expandCluster = useCallback(
    async (cluster: ClusterMarkerData) => {
      if (!mapRef) return;
      const map = mapRef.getMap();
      const source = map.getSource(ACTIVITIES_SOURCE_ID) as
        | GeoJSONSource
        | undefined;
      if (!source) return;
      try {
        const zoom = await source.getClusterExpansionZoom(cluster.clusterId);
        map.easeTo({
          center: [cluster.longitude, cluster.latitude],
          zoom,
          duration: 500,
        });
      } catch {
        // Cluster déjà recomposé (zoom entre-temps) : ignorer.
      }
    },
    [mapRef],
  );

  return (
    <>
      {clusters.map((cluster) => (
        <Marker
          key={cluster.key}
          longitude={cluster.longitude}
          latitude={cluster.latitude}
          anchor="center"
        >
          <button
            type="button"
            onClick={() => void expandCluster(cluster)}
            aria-label={`Groupe de ${cluster.count} activités — zoomer`}
            className={cn(
              "flex items-center justify-center rounded-full bg-peyi-orange-500 font-display font-bold text-white shadow-md ring-4 ring-peyi-orange-500/25 transition hover:bg-peyi-orange-600 active:scale-95",
              cluster.count >= 50
                ? "h-14 w-14 text-base"
                : cluster.count >= 10
                  ? "h-12 w-12 text-sm"
                  : "h-11 w-11 text-sm",
            )}
          >
            {cluster.count}
          </button>
        </Marker>
      ))}

      {points.map((point) => {
        const meta = ACTIVITY_CATEGORIES[point.category] ?? null;
        const isSelected = point.slug === selectedSlug;
        const isHovered = point.slug === hoveredSlug;
        const elevated = isSelected || isHovered;
        return (
          <Marker
            key={point.key}
            longitude={point.longitude}
            latitude={point.latitude}
            anchor="center"
            style={{ zIndex: isSelected ? 30 : isHovered ? 20 : 1 }}
          >
            {/* Zone de tap 44×44 ; le visuel intérieur est plus petit pour
                garder une carte lisible quand les points sont denses. */}
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onSelect(point.slug);
              }}
              aria-label={point.name}
              title={point.name}
              className="group flex h-11 w-11 items-center justify-center"
            >
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-base shadow-md transition duration-base group-hover:scale-110",
                  elevated && "scale-125 shadow-lg",
                  isSelected && "ring-4 ring-peyi-orange-400/70",
                  isHovered && !isSelected && "ring-4 ring-peyi-orange-300/50",
                )}
                style={{ backgroundColor: meta?.color ?? "#6B7280" }}
              >
                <span aria-hidden>{meta?.emoji ?? "📍"}</span>
              </span>
            </button>
          </Marker>
        );
      })}
    </>
  );
}
