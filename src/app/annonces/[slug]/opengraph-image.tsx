import { ImageResponse } from "next/og";

import { prisma } from "@/lib/prisma";
import { formatPriceType } from "@/lib/listings/queries";

/**
 * OG image dynamique par annonce. Structure identique à celle des
 * bons plans (cf. `bons-plans/[slug]/opengraph-image.tsx`) pour
 * garder une cohérence visuelle entre les deux types de contenu :
 *   - colonne gauche avec cover (ou fallback emoji catégorie)
 *   - colonne droite avec logo Péyi, prix, titre et méta
 *
 * Différences :
 *   - Label "Annonce" au lieu de "Bon plan"
 *   - Prix formatté via `formatPriceType` pour gérer les cas
 *     particuliers (Négociable, Sur demande, À débattre, etc.)
 *   - Pas de seller secondaire : le vendeur est toujours l'auteur
 *     (C2C), on n'a pas de colonne dédiée
 */
export const runtime = "nodejs";
export const revalidate = 3600;
export const alt = "Annonce Péyi";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function truncate(input: string, max: number): string {
  if (input.length <= max) return input;
  return `${input.slice(0, max - 1).trimEnd()}…`;
}

export default async function ListingOgImage({
  params,
}: {
  params: { slug: string };
}) {
  const listing = await prisma.listing.findFirst({
    where: { slug: params.slug, status: "PUBLISHED" },
    select: {
      title: true,
      price: true,
      priceType: true,
      coverImageUrl: true,
      neighborhood: true,
      category: { select: { name: true, icon: true } },
      city: { select: { name: true } },
    },
  });

  const priceLabel = listing
    ? formatPriceType(listing.priceType, listing.price)
    : "Péyi";

  const title = listing
    ? truncate(listing.title, 80)
    : "Petites annonces 100% Guyane";
  const categoryIcon = listing?.category.icon ?? "🛒";
  const cover = listing?.coverImageUrl ?? null;
  const cityLabel = listing
    ? listing.neighborhood
      ? `${listing.city.name} · ${listing.neighborhood}`
      : listing.city.name
    : "peyi.com";
  const meta = listing
    ? `${categoryIcon} ${listing.category.name} · ${cityLabel}`
    : cityLabel;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "white",
          fontFamily:
            "system-ui, -apple-system, Segoe UI, Helvetica, Arial, sans-serif",
        }}
      >
        {/* Colonne gauche : cover ou emoji fallback */}
        <div
          style={{
            width: 520,
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: cover
              ? "#f5f5f5"
              : "linear-gradient(135deg, #FF914C 0%, #F57A2E 60%, #DB6418 100%)",
            overflow: "hidden",
          }}
        >
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cover}
              alt=""
              width={520}
              height={630}
              style={{
                width: 520,
                height: 630,
                objectFit: "cover",
              }}
            />
          ) : (
            <span style={{ fontSize: 240, display: "flex" }}>
              {categoryIcon}
            </span>
          )}
        </div>

        {/* Colonne droite : texte + branding */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: 56,
            background: "linear-gradient(135deg, #FFF1E5 0%, #FFFFFF 100%)",
          }}
        >
          {/* Top : logo + label */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 14,
                background:
                  "linear-gradient(135deg, #FF914C 0%, #F57A2E 60%, #DB6418 100%)",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 44,
                fontWeight: 800,
                letterSpacing: "-0.04em",
              }}
            >
              P
            </div>
            <span
              style={{
                fontSize: 36,
                fontWeight: 800,
                color: "#1a1a1a",
                letterSpacing: "-0.03em",
              }}
            >
              Péyi
            </span>
            <div style={{ flex: 1, display: "flex" }} />
            <span
              style={{
                fontSize: 22,
                color: "#DB6418",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                display: "flex",
              }}
            >
              Annonce
            </span>
          </div>

          {/* Middle : prix + titre */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex" }}>
              <span
                style={{
                  display: "flex",
                  padding: "14px 28px",
                  borderRadius: 18,
                  background: "#F57A2E",
                  color: "white",
                  fontSize: 56,
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                }}
              >
                {truncate(priceLabel, 32)}
              </span>
            </div>

            <span
              style={{
                fontSize: 44,
                fontWeight: 700,
                color: "#1a1a1a",
                lineHeight: 1.15,
                letterSpacing: "-0.02em",
                display: "flex",
              }}
            >
              {title}
            </span>
          </div>

          {/* Bottom : catégorie + ville */}
          <span
            style={{
              fontSize: 24,
              color: "#888",
              fontWeight: 500,
              display: "flex",
            }}
          >
            {meta}
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}
