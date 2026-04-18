import { ImageResponse } from "next/og";

import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/format";

/**
 * OG image dynamique par bon plan. Rendue côté serveur au moment où
 * un crawler social demande `/bons-plans/<slug>/opengraph-image`.
 *
 * Composition : deux colonnes. À gauche la cover (ou un fallback
 * emoji coloré si pas d'image). À droite un panneau texte avec le
 * logo Péyi, le prix en pastille orange, le titre et la méta
 * (catégorie · ville).
 *
 * Runtime nodejs : on a besoin de Prisma pour récupérer les infos du
 * deal. `revalidate = 3600` met le résultat en cache côté Vercel
 * pendant une heure pour ne pas retaper la DB à chaque partage.
 *
 * Si le deal n'existe plus ou n'est plus publié (supprimé,
 * dé-publié), on sert une image générique Péyi plutôt qu'une erreur —
 * les crawlers n'aiment pas les 500.
 */
export const runtime = "nodejs";
export const revalidate = 3600;
export const alt = "Bon plan Péyi";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Satori truncation (pas de `-webkit-line-clamp`) : on coupe avant
// le rendu pour éviter les overflow visuels sur des titres longs.
function truncate(input: string, max: number): string {
  if (input.length <= max) return input;
  return `${input.slice(0, max - 1).trimEnd()}…`;
}

export default async function DealOgImage({
  params,
}: {
  params: { slug: string };
}) {
  const deal = await prisma.deal.findFirst({
    where: { slug: params.slug, status: "PUBLISHED" },
    select: {
      title: true,
      price: true,
      isFree: true,
      coverImageUrl: true,
      category: { select: { name: true, icon: true } },
      city: { select: { name: true } },
      store: { select: { name: true } },
      merchant: { select: { name: true } },
    },
  });

  const priceLabel = !deal
    ? "Péyi"
    : deal.isFree
      ? "Gratuit"
      : formatPrice(Number(deal.price));

  const title = deal ? truncate(deal.title, 80) : "Les bons plans 100% Guyane";
  const sellerName = deal?.store?.name ?? deal?.merchant?.name ?? null;
  const categoryIcon = deal?.category.icon ?? "🎉";
  const cover = deal?.coverImageUrl ?? null;
  const meta = deal
    ? `${categoryIcon} ${deal.category.name}${deal.city ? ` · ${deal.city.name}` : ""}`
    : "peyi.com";

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
              Bon plan
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
                {priceLabel}
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

          {/* Bottom : seller + catégorie/ville */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            {sellerName ? (
              <span
                style={{
                  fontSize: 26,
                  color: "#333",
                  fontWeight: 700,
                  display: "flex",
                }}
              >
                {truncate(sellerName, 40)}
              </span>
            ) : null}
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
      </div>
    ),
    { ...size },
  );
}
