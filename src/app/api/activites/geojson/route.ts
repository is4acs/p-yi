import { NextResponse } from "next/server";

import {
  buildActivityFeatureCollection,
  EMPTY_ACTIVITY_COLLECTION,
} from "@/lib/activities/geojson";
import { getPublishedActivitiesForMap } from "@/lib/activities/queries";
import { withTimeout } from "@/lib/async/with-timeout";

/**
 * FeatureCollection minimal des activités publiées, pour la carte.
 *
 * - Payload volontairement mince (cf. `lib/activities/geojson.ts`) : le
 *   détail complet se charge au clic via `/api/activites/[slug]`.
 * - Cache CDN 5 min + stale-while-revalidate : le catalogue bouge peu, et
 *   le réseau mobile guyanais impose de servir depuis le edge autant que
 *   possible.
 * - DB en panne : collection vide en `no-store` (on n'empoisonne pas le
 *   cache CDN avec du vide) plutôt qu'un 500 — même politique que les
 *   sitemaps durcis.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QUERY_TIMEOUT_MS = 5_000;

export async function GET() {
  try {
    const rows = await withTimeout(
      getPublishedActivitiesForMap(),
      QUERY_TIMEOUT_MS,
      "activites/geojson",
    );

    return NextResponse.json(buildActivityFeatureCollection(rows), {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
      },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[api/activites/geojson] query failed", err);
    return NextResponse.json(EMPTY_ACTIVITY_COLLECTION, {
      headers: { "Cache-Control": "no-store" },
    });
  }
}
