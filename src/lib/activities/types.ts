import type {
  AccessMode,
  ActivityCategory,
  Difficulty,
  Season,
} from "@prisma/client";

import type { ActivityDetailRow } from "@/lib/activities/queries";

/**
 * Payload JSON de `/api/activites/[slug]`, partagé serveur/client. Shape
 * explicite (plutôt que le type Prisma brut) pour deux raisons : les Dates
 * ne survivent pas à la sérialisation JSON, et on choisit précisément ce
 * qui sort (pas de `status`/`viewCount`/timestamps dans la réponse).
 */

export type ActivityImagePayload = {
  id: string;
  url: string;
  altText: string;
  sortOrder: number;
  width: number | null;
  height: number | null;
};

export type ActivityOperatorPayload = {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  website: string | null;
  isVerified: boolean;
};

export type ActivityDetailPayload = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  category: ActivityCategory;
  tags: string[];
  latitude: number;
  longitude: number;
  address: string | null;
  startPoint: string | null;
  accessModes: AccessMode[];
  durationMinutes: number | null;
  difficulty: Difficulty | null;
  seasons: Season[];
  accessNote: string | null;
  priceMinCents: number | null;
  priceMaxCents: number | null;
  isFree: boolean;
  bookingRequired: boolean;
  bookingUrl: string | null;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  instagram: string | null;
  /** Json Prisma brut — à passer dans `parseOpeningHours` côté consommateur. */
  openingHours: unknown;
  city: { slug: string; name: string };
  images: ActivityImagePayload[];
  operator: ActivityOperatorPayload | null;
};

export function serializeActivityDetail(
  row: ActivityDetailRow,
): ActivityDetailPayload {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    tagline: row.tagline,
    description: row.description,
    category: row.category,
    tags: row.tags,
    latitude: row.latitude,
    longitude: row.longitude,
    address: row.address,
    startPoint: row.startPoint,
    accessModes: row.accessModes,
    durationMinutes: row.durationMinutes,
    difficulty: row.difficulty,
    seasons: row.seasons,
    accessNote: row.accessNote,
    priceMinCents: row.priceMinCents,
    priceMaxCents: row.priceMaxCents,
    isFree: row.isFree,
    bookingRequired: row.bookingRequired,
    bookingUrl: row.bookingUrl,
    phone: row.phone,
    whatsapp: row.whatsapp,
    website: row.website,
    instagram: row.instagram,
    openingHours: row.openingHours,
    city: { slug: row.city.slug, name: row.city.name },
    images: row.images.map((image) => ({
      id: image.id,
      url: image.url,
      altText: image.altText,
      sortOrder: image.sortOrder,
      width: image.width,
      height: image.height,
    })),
    operator: row.operator
      ? {
          id: row.operator.id,
          name: row.operator.name,
          slug: row.operator.slug,
          phone: row.operator.phone,
          website: row.operator.website,
          isVerified: row.operator.isVerified,
        }
      : null,
  };
}
