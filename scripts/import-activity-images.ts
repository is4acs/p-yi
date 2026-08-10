// =============================================================================
// PÉYI — Import des photos d'activités depuis Wikimedia Commons
// =============================================================================
// Usage :
//   npm run activites:images            → simulation (n'écrit RIEN)
//   npm run activites:images -- --apply → télécharge, upload et enregistre
//   npm run activites:images -- --apply --slug=iles-du-salut  → une seule fiche
//   npm run activites:images -- --apply --force → remplace les photos existantes
//
// Pourquoi Wikimedia Commons plutôt qu'une recherche d'images classique :
// Commons n'héberge QUE des médias librement réutilisables (domaine public
// ou Creative Commons). Récupérer « la plus belle photo » trouvée sur le web
// exposerait Péyi à une réclamation pour contrefaçon — un site commercial
// n'a aucune tolérance sur ce point. En contrepartie, la licence impose de
// créditer l'auteur : c'est ce que remplit la colonne `credit`, affichée
// sous le carrousel de chaque fiche.
//
// Le script est idempotent et sans effet de bord en mode simulation. Il
// ignore les fiches qui ont déjà une photo (sauf `--force`).
// =============================================================================

import "dotenv/config";

import { PrismaClient } from "@prisma/client";

import { IMAGE_QUERIES } from "../prisma/data/activities";

const prisma = new PrismaClient();

const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
const BUCKET = "activities";
/** Largeur demandée à Commons : suffisant pour un carrousel plein écran. */
const TARGET_WIDTH = 1600;
const MIN_SOURCE_WIDTH = 900;

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const FORCE = args.includes("--force");
const ONLY = args.find((a) => a.startsWith("--slug="))?.slice("--slug=".length);

type CommonsImage = {
  title: string;
  thumbUrl: string;
  descriptionUrl: string;
  width: number;
  mime: string;
  artist: string;
  license: string;
};

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Cherche sur Commons et renvoie la première image exploitable. */
async function findImage(query: string): Promise<CommonsImage | null> {
  const url = new URL(COMMONS_API);
  url.search = new URLSearchParams({
    action: "query",
    format: "json",
    origin: "*",
    generator: "search",
    gsrsearch: query,
    gsrnamespace: "6", // espace « File: »
    gsrlimit: "8",
    prop: "imageinfo",
    iiprop: "url|size|mime|extmetadata",
    iiurlwidth: String(TARGET_WIDTH),
  }).toString();

  const response = await fetch(url, {
    headers: { "User-Agent": "PeyiBot/1.0 (https://peyi.gf; contact@peyi.gf)" },
  });
  if (!response.ok) throw new Error(`Commons HTTP ${response.status}`);

  const body = (await response.json()) as {
    query?: { pages?: Record<string, unknown> };
  };
  const pages = Object.values(body.query?.pages ?? {}) as Array<{
    title: string;
    imageinfo?: Array<{
      thumburl?: string;
      descriptionurl?: string;
      width?: number;
      mime?: string;
      extmetadata?: Record<string, { value?: string }>;
    }>;
  }>;

  for (const page of pages) {
    const info = page.imageinfo?.[0];
    if (!info?.thumburl) continue;
    // Photos uniquement : pas de SVG (cartes, blasons) ni de PDF.
    if (!/^image\/(jpeg|png|webp)$/.test(info.mime ?? "")) continue;
    if ((info.width ?? 0) < MIN_SOURCE_WIDTH) continue;

    const meta = info.extmetadata ?? {};
    return {
      title: page.title,
      thumbUrl: info.thumburl,
      descriptionUrl: info.descriptionurl ?? "",
      width: info.width ?? 0,
      mime: info.mime ?? "image/jpeg",
      artist: stripHtml(meta.Artist?.value ?? "Auteur inconnu"),
      license: stripHtml(meta.LicenseShortName?.value ?? "voir Commons"),
    };
  }
  return null;
}

/** Upload dans le bucket Supabase via l'API REST Storage (service role). */
async function uploadToSupabase(
  path: string,
  bytes: ArrayBuffer,
  contentType: string,
): Promise<string> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis pour --apply",
    );
  }

  const endpoint = `${base}/storage/v1/object/${BUCKET}/${path}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": contentType,
      "x-upsert": "true",
    },
    body: Buffer.from(bytes),
  });
  if (!response.ok) {
    throw new Error(
      `Upload Supabase échoué (${response.status}) : ${await response.text()}`,
    );
  }
  return `${base}/storage/v1/object/public/${BUCKET}/${path}`;
}

function extensionFor(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

async function main() {
  console.log(
    APPLY
      ? "📷 Import des photos (écriture réelle)"
      : "🔍 SIMULATION — aucune écriture. Ajoute --apply pour appliquer.",
  );

  const activities = await prisma.activity.findMany({
    where: ONLY ? { slug: ONLY } : {},
    select: {
      id: true,
      slug: true,
      name: true,
      _count: { select: { images: true } },
    },
    orderBy: { name: "asc" },
  });

  if (activities.length === 0) {
    console.log("Aucune activité trouvée. La base est-elle seedée ?");
    return;
  }

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (const activity of activities) {
    const query = IMAGE_QUERIES[activity.slug];
    if (!query) {
      console.log(`  ⏭  ${activity.name} — aucun terme de recherche défini`);
      skipped += 1;
      continue;
    }
    if (activity._count.images > 0 && !FORCE) {
      console.log(`  ⏭  ${activity.name} — a déjà une photo (--force pour remplacer)`);
      skipped += 1;
      continue;
    }

    try {
      const image = await findImage(query);
      if (!image) {
        console.log(`  ✖  ${activity.name} — rien de libre trouvé pour « ${query} »`);
        failed += 1;
        continue;
      }

      const credit = `${image.artist} / ${image.license} — Wikimedia Commons`;
      console.log(`  ✔  ${activity.name}`);
      console.log(`       ${image.title} (${image.width}px)`);
      console.log(`       ${credit}`);

      if (!APPLY) {
        imported += 1;
        continue;
      }

      const bytes = await fetch(image.thumbUrl, {
        headers: { "User-Agent": "PeyiBot/1.0 (https://peyi.gf; contact@peyi.gf)" },
      }).then((r) => {
        if (!r.ok) throw new Error(`Téléchargement HTTP ${r.status}`);
        return r.arrayBuffer();
      });

      const path = `commons/${activity.slug}.${extensionFor(image.mime)}`;
      const publicUrl = await uploadToSupabase(path, bytes, image.mime);

      await prisma.$transaction([
        prisma.activityImage.deleteMany({ where: { activityId: activity.id } }),
        prisma.activityImage.create({
          data: {
            activityId: activity.id,
            url: publicUrl,
            altText: activity.name,
            credit,
            sortOrder: 0,
          },
        }),
      ]);
      imported += 1;
    } catch (err) {
      console.log(
        `  ✖  ${activity.name} — ${err instanceof Error ? err.message : String(err)}`,
      );
      failed += 1;
    }
  }

  console.log(
    `\n${APPLY ? "Importées" : "Trouvées"} : ${imported} · ignorées : ${skipped} · échecs : ${failed}`,
  );
  if (!APPLY && imported > 0) {
    console.log("Relance avec --apply pour écrire en base et dans le bucket.");
  }
}

main()
  .catch((e) => {
    console.error("❌ Import interrompu :", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
