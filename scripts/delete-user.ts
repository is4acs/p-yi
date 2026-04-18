// =============================================================================
// PÉYI — Suppression d'un compte utilisateur (RGPD)
// =============================================================================
// Version CLI de la suppression de compte, pour honorer les demandes
// RGPD arrivées par email / courrier (quand l'utilisateur ne passe
// PAS par /profil/confidentialite/supprimer en étant connecté).
//
// Cette CLI reproduit exactement la logique de `deleteMyAccountAction`
// (src/app/profil/confidentialite/supprimer/actions.ts) — si tu la
// modifies, mets à jour l'autre en parallèle.
//
// Ce que ça fait :
//   1. Anonymise les commentaires qui ont des replies d'autres users
//      → réattache au user système __deleted__
//   2. NULL les Message.listingId pointant vers les listings de l'user
//   3. Anonymise/réattache : messages envoyés/reçus, reports, logs admin
//   4. Delete du user (cascade : sessions, deals, listings, votes,
//      favoris, alertes, karma, notifications reçues, commentaires
//      sans replies)
//   5. Vide les dossiers listings/<uid>/* et deals/<uid>/* du storage
//   6. Supprime l'entrée auth.users dans Supabase
//
// Usage :
//   npm run delete-user -- <email>
//   npx tsx scripts/delete-user.ts <email>
//
// Ce script exige une confirmation interactive — il affiche le
// résumé du compte et attend "SUPPRIMER" en stdin. Rien n'est
// touché avant confirmation.
// =============================================================================

import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const prisma = new PrismaClient();

const DELETED_USER_USERNAME = "__deleted__";
const DELETED_USER_EMAIL = "deleted-user@peyi.internal";

async function getOrCreateDeletedUser(
  tx: Pick<PrismaClient, "user"> | PrismaClient = prisma,
) {
  return tx.user.upsert({
    where: { username: DELETED_USER_USERNAME },
    update: {},
    create: {
      email: DELETED_USER_EMAIL,
      username: DELETED_USER_USERNAME,
      fullName: "[Compte supprimé]",
      isBanned: true,
      banReason:
        "Compte système — placeholder pour les contenus anonymisés après suppression d'un utilisateur.",
      role: "USER",
    },
  });
}

// Le type exact du SupabaseClient dépend de la génération de types du
// projet. On utilise `any` ici pour le script CLI — contexte hors app,
// pas d'enjeu de type safety run-time puisqu'on est en Node standalone.
type AnySupabase = ReturnType<typeof createClient<any, "public", "public">>;

async function removeBucketFolder(
  supabase: AnySupabase,
  bucket: string,
  userId: string,
): Promise<number> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(userId, { limit: 1000 });
    if (error || !data || data.length === 0) return 0;
    const paths = data.map((f: { name: string }) => `${userId}/${f.name}`);
    await supabase.storage.from(bucket).remove(paths);
    return paths.length;
  } catch {
    return 0;
  }
}

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();

  if (!email || !email.includes("@")) {
    console.error("❌ Usage: npx tsx scripts/delete-user.ts <email>");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      createdAt: true,
      _count: {
        select: {
          listings: true,
          deals: true,
          comments: true,
          messagesSent: true,
          messagesReceived: true,
        },
      },
    },
  });

  if (!user) {
    console.error(`❌ Aucun utilisateur avec l'email "${email}".`);
    process.exit(1);
  }

  if (user.username === DELETED_USER_USERNAME) {
    console.error("❌ Le compte système __deleted__ ne peut pas être supprimé.");
    process.exit(1);
  }

  console.log("");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  Compte à supprimer");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`  Username    : @${user.username}`);
  console.log(`  Email       : ${user.email}`);
  console.log(`  Rôle        : ${user.role}`);
  console.log(`  Créé le     : ${user.createdAt.toISOString()}`);
  console.log(`  Annonces    : ${user._count.listings}`);
  console.log(`  Bons plans  : ${user._count.deals}`);
  console.log(`  Commentaires: ${user._count.comments}`);
  console.log(`  Messages    : ${user._count.messagesSent} envoyés, ${user._count.messagesReceived} reçus`);
  console.log("═══════════════════════════════════════════════════════════");
  console.log("");

  const rl = createInterface({ input: stdin, output: stdout });
  const answer = await rl.question(
    "⚠️  Cette action est IRRÉVERSIBLE. Tape exactement SUPPRIMER pour confirmer : ",
  );
  rl.close();

  if (answer.trim() !== "SUPPRIMER") {
    console.log("❌ Annulé.");
    process.exit(0);
  }

  console.log("");
  console.log("→ Création/récupération du compte système __deleted__…");
  const systemUser = await getOrCreateDeletedUser();

  console.log("→ Identification des commentaires à anonymiser…");
  const commentsWithRepliesFromOthers = await prisma.comment.findMany({
    where: {
      authorId: user.id,
      isDeleted: false,
      replies: {
        some: {
          authorId: { not: user.id },
          isDeleted: false,
        },
      },
    },
    select: { id: true },
  });
  const commentIdsToAnonymize = commentsWithRepliesFromOthers.map((c) => c.id);
  console.log(`  ${commentIdsToAnonymize.length} commentaire(s) à anonymiser.`);

  console.log("→ Transaction DB…");
  await prisma.$transaction(async (tx) => {
    if (commentIdsToAnonymize.length > 0) {
      await tx.comment.updateMany({
        where: { id: { in: commentIdsToAnonymize } },
        data: {
          authorId: systemUser.id,
          content: "[compte supprimé]",
          isDeleted: true,
        },
      });
    }

    await tx.message.updateMany({
      where: { listing: { authorId: user.id } },
      data: { listingId: null },
    });
    await tx.message.updateMany({
      where: { senderId: user.id },
      data: {
        senderId: systemUser.id,
        content: "[message supprimé par un utilisateur]",
      },
    });
    await tx.message.updateMany({
      where: { recipientId: user.id },
      data: { recipientId: systemUser.id },
    });
    await tx.report.updateMany({
      where: { reporterId: user.id },
      data: { reporterId: systemUser.id },
    });
    await tx.report.updateMany({
      where: { reportedUserId: user.id },
      data: { reportedUserId: null },
    });
    await tx.adminActionLog.updateMany({
      where: { adminId: user.id },
      data: { adminId: systemUser.id },
    });
    await tx.user.delete({ where: { id: user.id } });
  });
  console.log("  ✅ Profil Prisma supprimé, contenus tiers anonymisés.");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && serviceRole) {
    console.log("→ Nettoyage du storage…");
    const supabase = createClient(supabaseUrl, serviceRole, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const [listingFiles, dealFiles] = await Promise.all([
      removeBucketFolder(supabase, "listings", user.id),
      removeBucketFolder(supabase, "deals", user.id),
    ]);
    console.log(`  ✅ ${listingFiles} fichier(s) listing, ${dealFiles} fichier(s) deal supprimé(s).`);

    console.log("→ Suppression de l'entrée auth.users Supabase…");
    const { error } = await supabase.auth.admin.deleteUser(user.id);
    if (error) {
      console.warn(`  ⚠️  Échec Supabase Auth : ${error.message}`);
      console.warn("     À nettoyer manuellement dans Supabase Dashboard → Authentication.");
    } else {
      console.log("  ✅ Entrée auth.users supprimée.");
    }
  } else {
    console.warn(
      "⚠️  NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY manquants — storage et auth.users NON nettoyés.",
    );
  }

  console.log("");
  console.log(`✅ Compte @${user.username} (${user.email}) supprimé.`);
}

main()
  .catch((err) => {
    console.error("❌ Erreur :", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
