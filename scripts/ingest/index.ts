/**
 * CLI d'ingestion de bons plans Péyi.
 *
 * Usage :
 *   npm run ingest                        # toutes les sources
 *   npm run ingest -- --source local-file # une seule source
 *   npm run ingest -- --dry-run           # aucun write en DB
 *   npm run ingest -- --limit 50          # max 50 items par source
 *   npm run ingest -- --spread 45         # étale publishedAt sur 45j
 *
 * Par défaut : --limit 80 par source, --spread 0 (aucun étalement,
 * les publishedAt viennent des sources).
 */
import { PrismaClient } from "@prisma/client";
import type { Source, DealCandidate, IngestOptions } from "./types";
import { BladaRssSource } from "./sources/blada-rss";
import { FranceGuyaneRssSource } from "./sources/franceguyane-rss";
import { LocalFileSource } from "./sources/local-file";
import { dedupeBatch } from "./lib/dedupe";
import { attachEngagement, spreadPublishedAt } from "./lib/engagement";
import { buildContext, writeCandidates } from "./lib/write";

function parseArgs(argv: string[]): IngestOptions {
  const opts: IngestOptions = {
    dryRun: false,
    limit: 80,
    spread: false,
    spreadDays: 30,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") opts.dryRun = true;
    else if (a === "--source") opts.sourceFilter = argv[++i];
    else if (a === "--limit") opts.limit = parseInt(argv[++i], 10);
    else if (a === "--spread") {
      opts.spread = true;
      const next = argv[i + 1];
      if (next && /^\d+$/.test(next)) {
        opts.spreadDays = parseInt(next, 10);
        i++;
      }
    }
  }
  return opts;
}

function allSources(): Source[] {
  return [
    new LocalFileSource(),
    new BladaRssSource(),
    new FranceGuyaneRssSource(),
  ];
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  console.log("🚚 Péyi — ingestion de bons plans");
  console.log(
    `   mode=${opts.dryRun ? "DRY-RUN" : "WRITE"} limit=${opts.limit} spread=${opts.spread ? opts.spreadDays + "j" : "off"}`,
  );

  const sources = allSources().filter(
    (s) => !opts.sourceFilter || s.name === opts.sourceFilter,
  );
  if (sources.length === 0) {
    console.error(`❌ Aucune source ne matche --source=${opts.sourceFilter}`);
    process.exit(1);
  }

  // 1. Fetch en parallèle
  const all: DealCandidate[] = [];
  await Promise.all(
    sources.map(async (s) => {
      try {
        console.log(`\n📡 fetch ${s.name}…`);
        const c = await s.fetch(opts.limit);
        console.log(`   → ${c.length} candidats`);
        all.push(...c);
      } catch (err) {
        console.warn(`   ⚠️  ${s.name} a échoué : ${(err as Error).message}`);
      }
    }),
  );

  // 2. Dedupe global
  const deduped = dedupeBatch(all);
  console.log(
    `\n🧹 dedupe : ${all.length} → ${deduped.length} candidats uniques`,
  );

  // 3. Étalement temporel optionnel
  const spread = opts.spread
    ? deduped.map((c) => ({
        ...c,
        publishedAt: spreadPublishedAt(c, opts.spreadDays),
      }))
    : deduped;

  // 4. Engagement + attribution author
  const attributed = spread.map(attachEngagement);

  // 5. Dry-run : on imprime un preview et on s'arrête
  if (opts.dryRun) {
    console.log("\n— DRY-RUN preview (10 premiers) —");
    for (const c of attributed.slice(0, 10)) {
      console.log(
        `  • [${c.source}] ${c.title.slice(0, 60)} ` +
          `— ${c.price}€${c.originalPrice ? " /" + c.originalPrice + "€" : ""} ` +
          `• ${c.categorySlug}${c.citySlug ? "/" + c.citySlug : ""} ` +
          `→ @${c.authorUsername} (🔥${c.temperature}° 👁${c.viewCount})`,
      );
    }
    console.log(`\n(${attributed.length} candidats seraient écrits)`);
    process.exit(0);
  }

  // 6. Write
  const prisma = new PrismaClient();
  try {
    console.log("\n🔌 connexion DB…");
    const ctx = await buildContext(prisma);
    console.log(`   ${ctx.userIdByUsername.size} personas prêts`);

    console.log("\n💾 écriture en DB…");
    const res = await writeCandidates(ctx, attributed);
    console.log(
      `\n✅ ${res.created} créés · ${res.updated} mis à jour · ${res.skipped} skippés`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
