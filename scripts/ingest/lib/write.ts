/**
 * Écriture des deals ingérés dans la DB Péyi via Prisma.
 *
 * Opère en "upsert par externalUrl" : si un deal existe déjà pour la
 * même offre marchand, on met à jour les chiffres d'engagement sans
 * dupliquer. Sinon on crée le deal + images + votes + commentaires
 * associés.
 *
 * Hypothèses :
 *   - Les personas existent en DB (sinon on les crée à la volée).
 *   - Les catégories / villes / stores / merchants viennent du `seed.ts`
 *     de prod (prisma/seed.ts). Un candidat avec une category inconnue
 *     est skippé avec un warn.
 */
import { Prisma, PrismaClient, DealStatus } from "@prisma/client";
import type { AttributedCandidate } from "../types";
import { PERSONAS, karmaLevel } from "../personas";
import { makeDealSlug } from "@/lib/deals/slug";

type Ctx = {
  prisma: PrismaClient;
  categoryIdBySlug: Map<string, string>;
  cityIdBySlug: Map<string, string>;
  storeIdBySlug: Map<string, string>;
  merchantIdBySlug: Map<string, string>;
  userIdByUsername: Map<string, string>;
};

export async function buildContext(prisma: PrismaClient): Promise<Ctx> {
  const [cats, cities, stores, merchants] = await Promise.all([
    prisma.category.findMany({ select: { id: true, slug: true } }),
    prisma.city.findMany({ select: { id: true, slug: true } }),
    prisma.store.findMany({ select: { id: true, slug: true } }),
    prisma.merchant.findMany({ select: { id: true, slug: true } }),
  ]);

  const ctx: Ctx = {
    prisma,
    categoryIdBySlug: new Map(cats.map((c) => [c.slug, c.id])),
    cityIdBySlug: new Map(cities.map((c) => [c.slug, c.id])),
    storeIdBySlug: new Map(stores.map((s) => [s.slug, s.id])),
    merchantIdBySlug: new Map(merchants.map((m) => [m.slug, m.id])),
    userIdByUsername: new Map(),
  };

  // Crée/upsert tous les personas et cache leur ID
  for (const p of PERSONAS) {
    const cityId = ctx.cityIdBySlug.get(p.citySlug);
    const user = await prisma.user.upsert({
      where: { username: p.username },
      update: {
        karma: p.karma,
        level: karmaLevel(p.karma),
        cityId,
        bio: p.bio,
      },
      create: {
        email: `${p.username}@peyi.local`,
        username: p.username,
        fullName: p.fullName,
        phoneVerified: true,
        karma: p.karma,
        level: karmaLevel(p.karma),
        cityId,
        bio: p.bio,
      },
      select: { id: true },
    });
    ctx.userIdByUsername.set(p.username, user.id);
  }

  return ctx;
}

export type WriteResult = {
  created: number;
  updated: number;
  skipped: number;
};

export async function writeCandidates(
  ctx: Ctx,
  candidates: AttributedCandidate[],
): Promise<WriteResult> {
  const result: WriteResult = { created: 0, updated: 0, skipped: 0 };

  for (const c of candidates) {
    const categoryId = ctx.categoryIdBySlug.get(c.categorySlug);
    if (!categoryId) {
      console.warn(
        `  ⚠️  skip "${c.title.slice(0, 60)}" — category ${c.categorySlug} inconnue`,
      );
      result.skipped++;
      continue;
    }
    const authorId = ctx.userIdByUsername.get(c.authorUsername);
    if (!authorId) {
      console.warn(
        `  ⚠️  skip "${c.title.slice(0, 60)}" — persona ${c.authorUsername} manquant`,
      );
      result.skipped++;
      continue;
    }

    const cityId = c.citySlug ? ctx.cityIdBySlug.get(c.citySlug) : undefined;
    const storeId = c.storeSlug ? ctx.storeIdBySlug.get(c.storeSlug) : undefined;
    const merchantId = c.merchantSlug
      ? ctx.merchantIdBySlug.get(c.merchantSlug)
      : undefined;

    const discountPercent =
      c.originalPrice && c.originalPrice > c.price
        ? Math.round(((c.originalPrice - c.price) / c.originalPrice) * 100)
        : null;

    // Lookup doublons par externalUrl (clé forte) si présent
    const existing = c.externalUrl
      ? await ctx.prisma.deal.findFirst({
          where: { externalUrl: c.externalUrl },
          select: { id: true, slug: true },
        })
      : null;

    if (existing) {
      // Mise à jour des chiffres d'engagement (on monte, jamais on descend)
      await ctx.prisma.deal.update({
        where: { id: existing.id },
        data: {
          viewCount: { increment: Math.max(0, Math.floor(c.viewCount / 10)) },
          updatedAt: new Date(),
        },
      });
      result.updated++;
      continue;
    }

    const slug = makeDealSlug(c.title);

    try {
      await ctx.prisma.$transaction(async (tx) => {
        const deal = await tx.deal.create({
          data: {
            authorId,
            title: c.title,
            slug,
            description: c.description,
            price: new Prisma.Decimal(c.price.toFixed(2)),
            originalPrice:
              c.originalPrice != null
                ? new Prisma.Decimal(c.originalPrice.toFixed(2))
                : null,
            discountPercent,
            isFree: c.isFree ?? false,
            currency: "EUR",
            cityId,
            storeId,
            categoryId,
            merchantId,
            externalUrl: c.externalUrl,
            coverImageUrl: c.coverImageUrl,
            temperature: c.temperature,
            upvotes: c.upvotes,
            downvotes: c.downvotes,
            commentCount: c.seedComments.length,
            viewCount: c.viewCount,
            clickCount: c.clickCount,
            status: DealStatus.PUBLISHED,
            publishedAt: c.publishedAt,
            createdAt: c.publishedAt,
            expiresAt: c.expiresAt,
          },
          select: { id: true },
        });

        // Commentaires simulés depuis d'autres personas
        if (c.seedComments.length > 0) {
          const commenters = PERSONAS.filter(
            (p) => p.username !== c.authorUsername,
          );
          for (let i = 0; i < c.seedComments.length; i++) {
            const commenter = commenters[i % commenters.length];
            const commenterId = ctx.userIdByUsername.get(commenter.username);
            if (!commenterId) continue;
            // Étale les commentaires sur les heures suivant le publishedAt
            const at = new Date(
              c.publishedAt.getTime() + (i + 1) * 3_600_000 * (1 + i),
            );
            await tx.comment.create({
              data: {
                authorId: commenterId,
                dealId: deal.id,
                content: c.seedComments[i],
                createdAt: at,
                updatedAt: at,
              },
            });
          }
        }

        // Votes simulés (répartis parmi les autres personas)
        const voters = PERSONAS.filter((p) => p.username !== c.authorUsername);
        const totalVotes = Math.min(c.upvotes + c.downvotes, voters.length);
        const upCount = Math.min(c.upvotes, voters.length - 1);
        for (let i = 0; i < totalVotes; i++) {
          const voter = voters[i];
          const voterId = ctx.userIdByUsername.get(voter.username);
          if (!voterId) continue;
          await tx.vote.create({
            data: {
              userId: voterId,
              dealId: deal.id,
              value: i < upCount ? "HOT" : "COLD",
              createdAt: new Date(
                c.publishedAt.getTime() + i * 900_000, // 15 min entre chaque vote
              ),
            },
          });
        }

        // Karma au poster (+5 par deal posté, même règle que createDealAction)
        await tx.karmaHistory.create({
          data: {
            userId: authorId,
            action: "DEAL_POSTED",
            points: 5,
            dealId: deal.id,
            description: `Ingest: ${c.source}`,
          },
        });
        await tx.user.update({
          where: { id: authorId },
          data: { karma: { increment: 5 } },
        });
      });

      result.created++;
    } catch (err) {
      // P2002 = unique violation (slug collision). On retente avec un slug neuf.
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        console.warn(
          `  ⚠️  collision slug pour "${c.title.slice(0, 60)}" — skip`,
        );
        result.skipped++;
      } else {
        throw err;
      }
    }
  }

  return result;
}
