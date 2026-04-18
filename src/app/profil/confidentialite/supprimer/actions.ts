"use server";

import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/current-user";
import { getOrCreateDeletedUser } from "@/lib/auth/deleted-user";
import { prisma } from "@/lib/prisma";
import { removeAllDealImagesForUser } from "@/lib/storage/deal-images";
import { removeAllListingImagesForUser } from "@/lib/storage/listing-images";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function redirectWithError(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

/**
 * Suppression définitive du compte utilisateur (RGPD art. 17 — droit
 * à l'effacement). Appelée depuis le formulaire de confirmation sur
 * `/profil/confidentialite/supprimer`.
 *
 * ## Garde-fous
 * - Double confirmation : l'utilisateur doit taper exactement
 *   `SUPPRIMER` (case-sensitive) ET cocher la case "j'ai compris".
 *   Une faute de frappe redirige vers la page d'origine avec un
 *   message d'erreur, AUCUNE donnée n'est touchée.
 * - `requireUser` (pas `requireActiveUser`) : un utilisateur banni
 *   conserve le droit à l'effacement, le RGPD ne permet pas de le
 *   lui retirer.
 * - Pas de rate limit ici : la double confirmation empêche déjà
 *   l'exécution accidentelle ou par bot.
 *
 * ## Stratégie de suppression vs anonymisation
 *
 * L'idée : tout ce qui est exclusivement à l'utilisateur est supprimé,
 * tout ce qui implique un tiers est anonymisé pour préserver la
 * cohérence des échanges / de l'audit trail.
 *
 * ### Suppression par cascade Prisma (onDelete: Cascade sur User)
 *   - Session, KarmaHistory, Notification (reçues)
 *   - Deal (+ DealImage, Vote, Comment sur deal, Favorite, Click, Report sur deal)
 *   - Listing (+ ListingImage, Comment sur listing, Favorite, Report sur listing)
 *   - Vote, Favorite, Alert
 *   - Comment SANS replies tierces (cascade via authorId)
 *
 * ### Anonymisation — contenus à préserver pour les autres utilisateurs
 *   - **Commentaires avec replies d'autres users** : on réattache au
 *     user système, content remplacé par "[compte supprimé]",
 *     isDeleted=true. Sinon le cascade détruirait les réponses
 *     tierces (Comment.parentId → onDelete: Cascade).
 *   - **Messages** (envoyés ET reçus) : réattachés au user système.
 *     Le contenu des messages ENVOYÉS est remplacé par "[message
 *     supprimé par un utilisateur]" ; celui des messages REÇUS est
 *     préservé (l'autre partie a légitimement droit à l'historique
 *     de SA conversation).
 *   - **Reports faits par l'user** : réattachés au user système pour
 *     préserver la trace de modération.
 *   - **Reports contre l'user** : `reportedUserId = null` (le champ
 *     est nullable au schéma).
 *   - **AdminActionLog** : `adminId` réattaché au user système —
 *     l'audit trail est inaltérable par design.
 *
 * ### NULL avant cascade
 *   - **Message.listingId** pour les listings possédés par l'user :
 *     la FK Message → Listing n'a pas de cascade, il faut NULL avant
 *     que le cascade Listing → User ne déclenche.
 *
 * ### Storage
 *   - Vide `listings/<uid>/*` et `deals/<uid>/*` dans Supabase Storage.
 *     Best-effort, en dehors de la transaction DB (la priorité légale
 *     est la suppression des données identifiantes, les blobs orphelins
 *     sont un coût mineur qu'on nettoie au mieux).
 *
 * ### Supabase Auth
 *   - Supprime aussi l'entrée `auth.users` via le service role admin
 *     client, sinon l'utilisateur pourrait se reconnecter et recréer
 *     un profil avec le même email. Best-effort — si ça échoue, on
 *     log mais on ne rollback pas (le profil Prisma est déjà détruit,
 *     l'essentiel est fait).
 *
 * ## Redirect final
 * Déconnexion + redirect vers `/?deleted=1` pour afficher un message
 * de confirmation sur la home.
 */
export async function deleteMyAccountAction(formData: FormData): Promise<void> {
  const user = await requireUser("/profil/confidentialite/supprimer");

  const confirmation = formData.get("confirmation");
  const acknowledged = formData.get("acknowledged");

  if (typeof confirmation !== "string" || confirmation !== "SUPPRIMER") {
    redirectWithError(
      "/profil/confidentialite/supprimer",
      "Tape exactement SUPPRIMER (en majuscules) pour confirmer.",
    );
  }

  if (acknowledged !== "on") {
    redirectWithError(
      "/profil/confidentialite/supprimer",
      "Tu dois cocher la case pour confirmer avoir compris les conséquences.",
    );
  }

  // Garde-fou contre l'auto-suppression du compte système en cas de
  // conscription de la route par un admin compromis qui aurait
  // forgé un cookie système. Peu probable, mais une ligne de défense
  // en profondeur.
  if (user.username === "__deleted__") {
    redirectWithError(
      "/profil/confidentialite/supprimer",
      "Ce compte ne peut pas être supprimé.",
    );
  }

  // Étape 1 — Préparation : on récupère/crée le user système et on
  // identifie les commentaires à anonymiser AVANT la transaction
  // destructive, pour minimiser le temps passé dans la tx.
  const systemUser = await getOrCreateDeletedUser();

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

  // Étape 2 — Transaction DB : anonymisation + cascade delete en
  // atomicité. Si n'importe quelle étape casse, tout roll back.
  await prisma.$transaction(async (tx) => {
    // 2a. Anonymise les commentaires avec replies tierces.
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

    // 2b. NULL les Message.listingId qui pointent vers les listings
    // de l'utilisateur — FK Message→Listing n'a pas de cascade, donc
    // il faut casser cette référence AVANT que le cascade User→Listing
    // ne lance ses delete et ne déclenche un FK violation.
    await tx.message.updateMany({
      where: { listing: { authorId: user.id } },
      data: { listingId: null },
    });

    // 2c. Anonymise les messages envoyés (contenu remplacé).
    await tx.message.updateMany({
      where: { senderId: user.id },
      data: {
        senderId: systemUser.id,
        content: "[message supprimé par un utilisateur]",
      },
    });

    // 2d. Réattache les messages reçus au user système (contenu
    // conservé pour l'autre partie).
    await tx.message.updateMany({
      where: { recipientId: user.id },
      data: { recipientId: systemUser.id },
    });

    // 2e. Réattache les reports faits par l'user au user système.
    await tx.report.updateMany({
      where: { reporterId: user.id },
      data: { reporterId: systemUser.id },
    });

    // 2f. Détache les reports contre l'user (champ nullable).
    await tx.report.updateMany({
      where: { reportedUserId: user.id },
      data: { reportedUserId: null },
    });

    // 2g. Réattache les logs admin au user système (audit trail
    // préservé mais plus rattaché à l'identité du compte supprimé).
    await tx.adminActionLog.updateMany({
      where: { adminId: user.id },
      data: { adminId: systemUser.id },
    });

    // 2h. Suppression finale. Le cascade Prisma s'occupe du reste :
    // sessions, deals, listings, votes, favoris, alertes, karma
    // history, notifications reçues, commentaires sans replies.
    await tx.user.delete({ where: { id: user.id } });
  });

  // Étape 3 — Cleanup storage (best-effort, hors transaction).
  // Toujours en parallèle pour raccourcir le temps de réponse.
  await Promise.allSettled([
    removeAllListingImagesForUser(user.id),
    removeAllDealImagesForUser(user.id),
  ]);

  // Étape 4 — Supprimer l'entrée auth.users dans Supabase (via service
  // role). Sans ça, l'utilisateur pourrait se reconnecter avec le même
  // email et recréer un profil — le RGPD exige une vraie disparition.
  try {
    const admin = createSupabaseAdminClient();
    await admin.auth.admin.deleteUser(user.id);
  } catch (err) {
    // On log mais on ne rollback pas : le profil Prisma est déjà
    // supprimé, l'essentiel est fait. Un admin pourra nettoyer
    // manuellement l'orphelin auth côté Supabase si besoin.
    console.error("[delete-account] supabase auth delete failed:", err);
  }

  // Étape 5 — Invalide la session courante côté cookies.
  try {
    const supabase = createSupabaseServerClient();
    await supabase.auth.signOut();
  } catch {
    // Déjà déconnecté implicitement côté Supabase si l'user est
    // supprimé — on tolère l'erreur.
  }

  redirect("/?deleted=1");
}
