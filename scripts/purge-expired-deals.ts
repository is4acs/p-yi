// =============================================================================
// PÉYI — Nettoyage des bons plans dépassés (rattrapage manuel)
// =============================================================================
// Version CLI du volet « bons plans » du cron
// `/api/cron/expire-content`. Même logique partagée
// (`src/lib/deals/expiry.ts`), utile pour :
//   - vider le backlog historique la première fois (des bons plans
//     expirés depuis des mois qui traînaient encore en `PUBLISHED`) ;
//   - relancer à la main si un run Vercel a échoué ;
//   - vérifier ce qui va disparaître AVANT que le cron ne le fasse.
//
// Deux étapes, comme le cron :
//   1. marquage `PUBLISHED` + `expiresAt` passé  →  `EXPIRED`
//   2. suppression définitive des `EXPIRED` dépassés depuis plus de
//      N jours (7 par défaut), images du bucket comprises
//
// Usage :
//   npm run purge-expired-deals                 # dry-run, ne touche à rien
//   npm run purge-expired-deals -- --apply      # exécute
//   npm run purge-expired-deals -- --apply --retention=0   # purge tout
//   npm run purge-expired-deals -- --apply --limit=1000
//
// PAR DÉFAUT LE SCRIPT NE MODIFIE RIEN : il faut `--apply`. La
// suppression est irréversible (cascade sur images, votes, commentaires,
// favoris, clics, signalements).
// =============================================================================

import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

import {
  collectPurgeableDeals,
  DEFAULT_PURGE_LIMIT,
  markExpiredDeals,
  purgeDeals,
  resolveRetentionDays,
} from "../src/lib/deals/expiry";
import { DEAL_BUCKET, dealStoragePath } from "../src/lib/storage/deal-image-path";

const prisma = new PrismaClient();

type Options = {
  apply: boolean;
  retentionDays: number;
  limit: number;
};

function parseArgs(argv: string[]): Options {
  const apply = argv.includes("--apply");

  const flag = (name: string): string | undefined =>
    argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];

  const rawRetention = flag("retention");
  const retentionDays = resolveRetentionDays(rawRetention);
  if (rawRetention !== undefined && String(retentionDays) !== rawRetention) {
    console.warn(
      `⚠️  --retention=${rawRetention} invalide (entier >= 0 attendu) — ` +
        `on retombe sur ${retentionDays} jours.`,
    );
  }

  const rawLimit = flag("limit");
  const parsedLimit = Number(rawLimit);
  const limit =
    rawLimit && Number.isInteger(parsedLimit) && parsedLimit > 0
      ? parsedLimit
      : DEFAULT_PURGE_LIMIT;

  return { apply, retentionDays, limit };
}

/**
 * Nettoyage best-effort du bucket. On instancie le client Supabase
 * ici (service-role) plutôt que d'importer `@/lib/storage/deal-images`,
 * qui tirerait toute la validation d'env Next.
 */
async function removeImages(urls: string[]): Promise<number> {
  const paths = urls
    .map(dealStoragePath)
    .filter((p): p is string => Boolean(p));
  if (paths.length === 0) return 0;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.warn(
      "⚠️  NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY absents — " +
        `${paths.length} fichier(s) restent dans le bucket ${DEAL_BUCKET}.`,
    );
    return 0;
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Best-effort : les lignes sont déjà supprimées à ce stade, une
  // erreur storage ne doit pas faire échouer le script (au pire des
  // fichiers orphelins, qu'un second passage ne retrouvera plus).
  const BATCH = 100;
  let removed = 0;
  for (let i = 0; i < paths.length; i += BATCH) {
    const batch = paths.slice(i, i + BATCH);
    try {
      const { error } = await supabase.storage.from(DEAL_BUCKET).remove(batch);
      if (error) {
        console.warn(`⚠️  Suppression storage partielle : ${error.message}`);
      } else {
        removed += batch.length;
      }
    } catch (err) {
      console.warn(
        `⚠️  Suppression storage échouée : ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
  return removed;
}

async function main() {
  const { apply, retentionDays, limit } = parseArgs(process.argv.slice(2));
  const now = new Date();

  console.log(
    `🧹 Bons plans dépassés — rétention ${retentionDays} j, max ${limit} suppressions` +
      (apply ? "" : "  (DRY-RUN, aucune écriture)"),
  );

  // --- 1. Marquage -----------------------------------------------------
  const toExpire = await prisma.deal.count({
    where: { status: "PUBLISHED", expiresAt: { lt: now } },
  });
  if (apply) {
    const expired = await markExpiredDeals(prisma, now);
    console.log(`   → ${expired} bon(s) plan(s) passé(s) en EXPIRED`);
  } else {
    console.log(`   → ${toExpire} bon(s) plan(s) passerai(en)t en EXPIRED`);
  }

  // --- 2. Purge --------------------------------------------------------
  // En dry-run le marquage n'a pas eu lieu : on inclut les deals encore
  // `PUBLISHED` pour que l'aperçu reflète ce qu'un `--apply`
  // supprimerait vraiment.
  const candidates = await collectPurgeableDeals(prisma, {
    now,
    retentionDays,
    limit,
    includeUnmarked: !apply,
  });

  if (candidates.length === 0) {
    console.log("   → rien à supprimer. ✅");
    return;
  }

  console.log(`   → ${candidates.length} bon(s) plan(s) à supprimer :`);
  for (const c of candidates.slice(0, 20)) {
    const when = c.expiresAt ? c.expiresAt.toISOString().slice(0, 10) : "?";
    console.log(`      · [expiré ${when}] ${c.slug} — ${c.title.slice(0, 60)}`);
  }
  if (candidates.length > 20) {
    console.log(`      · … et ${candidates.length - 20} autre(s)`);
  }

  if (!apply) {
    console.log("\nDry-run terminé. Relance avec --apply pour exécuter.");
    return;
  }

  const purged = await purgeDeals(prisma, candidates);
  const images = await removeImages(candidates.flatMap((c) => c.imageUrls));
  console.log(`\n✅ ${purged} bon(s) plan(s) supprimé(s), ${images} image(s) nettoyée(s).`);

  if (candidates.length === limit) {
    console.log(
      "ℹ️  Limite atteinte — relance le script pour traiter le reste du backlog.",
    );
  }
}

main()
  .catch((err) => {
    console.error("❌ Échec du nettoyage :", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
