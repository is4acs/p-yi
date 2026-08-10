import { NextResponse } from "next/server";

import {
  bumpActivityViewCount,
  getPublishedActivityBySlug,
} from "@/lib/activities/queries";
import { serializeActivityDetail } from "@/lib/activities/types";
import { withTimeout } from "@/lib/async/with-timeout";

/**
 * Détail complet d'une activité publiée (images, horaires, opérateur…),
 * chargé à la demande au clic sur un marqueur — jamais dans le payload
 * initial de la carte. Cache CDN court + stale-while-revalidate.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QUERY_TIMEOUT_MS = 5_000;

export async function GET(
  _request: Request,
  props: { params: Promise<{ slug: string }> },
) {
  const { slug } = await props.params;

  try {
    const activity = await withTimeout(
      getPublishedActivityBySlug(slug),
      QUERY_TIMEOUT_MS,
      "activites/detail",
    );

    if (!activity) {
      return NextResponse.json(
        { error: "not_found" },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }

    bumpActivityViewCount(activity.id);

    return NextResponse.json(serializeActivityDetail(activity), {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
      },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[api/activites/detail] query failed", { slug, err });
    return NextResponse.json(
      { error: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
