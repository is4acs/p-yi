import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { exportLimiter } from "@/lib/rate-limit";

/**
 * GET /api/me/export — Export RGPD (droit à la portabilité, art. 20).
 *
 * Renvoie un JSON structuré contenant l'intégralité des données
 * personnelles de l'utilisateur connecté, dans un format lisible et
 * réutilisable. Téléchargement direct en `application/json` avec un
 * nom de fichier du type `peyi-export-<username>-<date>.json`.
 *
 * Choix notables :
 * - Authentification via `requireUser` (et PAS `requireActiveUser`) :
 *   un utilisateur banni conserve son droit à la portabilité. Le RGPD
 *   ne permet pas de retirer ce droit, même en cas de bannissement.
 * - Rate limit 1 / 24 h / utilisateur : l'export est coûteux (~10
 *   requêtes en parallèle + sérialisation de tout le contenu), et on
 *   protège contre l'abus d'un compte compromis qui tenterait de vider
 *   la base. 24 h correspond à la promesse affichée dans le hub.
 * - On inclut les messages envoyés ET reçus — c'est SON export, donc
 *   il doit avoir sa vue complète de ses échanges. Pour les messages
 *   reçus, on expose `senderId` mais PAS le username du sender pour
 *   éviter de leaker l'identité d'autres utilisateurs dans l'export
 *   (ces IDs ne sont pas actionnables hors de Péyi).
 * - On n'inclut PAS : hashedPassword (pas stocké côté Prisma de toute
 *   façon, Supabase gère), sessions, notificationSettings internes
 *   qui contiennent des flags techniques. Le profil est remonté au
 *   sens "données personnelles identifiantes".
 * - Statut HTTP 429 si la limite est atteinte, avec un message FR.
 *
 * Format :
 * ```json
 * {
 *   "_meta": { "version": "1.0", "exportedAt": "...", "userId": "...", "format": "application/json" },
 *   "profile": { ... },
 *   "listings": [ ... ],
 *   "deals": [ ... ],
 *   "comments": [ ... ],
 *   "messages": { "sent": [ ... ], "received": [ ... ] },
 *   "favorites": { "deals": [ ... ], "listings": [ ... ] },
 *   "alerts": [ ... ],
 *   "votes": [ ... ],
 *   "notifications": [ ... ]
 * }
 * ```
 */
export async function GET() {
  const user = await requireUser("/profil/confidentialite");

  // Rate limit 1/24h par userId. Si Upstash n'est pas configuré (dev),
  // le limiter no-op laisse passer.
  const { success, reset } = await exportLimiter.limit(user.id);
  if (!success) {
    const resetDate = new Date(reset);
    const hoursLeft = Math.max(
      1,
      Math.ceil((resetDate.getTime() - Date.now()) / (1000 * 60 * 60)),
    );
    return NextResponse.json(
      {
        error: "rate_limited",
        message: `Tu as déjà exporté tes données récemment. Réessaie dans ${hoursLeft} heure${hoursLeft > 1 ? "s" : ""}.`,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((resetDate.getTime() - Date.now()) / 1000)),
        },
      },
    );
  }

  // Collecte en parallèle. Toutes les queries sont indexées sur userId/
  // authorId, donc le coût DB reste linéaire en quantité de contenu
  // personnel, jamais global.
  const [
    profile,
    listings,
    deals,
    comments,
    messagesSent,
    messagesReceived,
    dealFavorites,
    listingFavorites,
    alerts,
    votes,
    notifications,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        phone: true,
        phoneVerified: true,
        username: true,
        fullName: true,
        avatarUrl: true,
        bio: true,
        cityId: true,
        karma: true,
        level: true,
        role: true,
        isProAccount: true,
        preferredLanguage: true,
        createdAt: true,
        updatedAt: true,
        lastActiveAt: true,
      },
    }),
    prisma.listing.findMany({
      where: { authorId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        images: { select: { url: true, altText: true, sortOrder: true } },
        category: { select: { name: true, slug: true } },
        city: { select: { name: true, slug: true } },
      },
    }),
    prisma.deal.findMany({
      where: { authorId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        images: { select: { url: true, altText: true, sortOrder: true } },
        category: { select: { name: true, slug: true } },
        city: { select: { name: true, slug: true } },
      },
    }),
    prisma.comment.findMany({
      where: { authorId: user.id, isDeleted: false },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        content: true,
        dealId: true,
        listingId: true,
        parentId: true,
        upvotes: true,
        isEdited: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.message.findMany({
      where: { senderId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        recipientId: true,
        listingId: true,
        content: true,
        isRead: true,
        readAt: true,
        createdAt: true,
      },
    }),
    prisma.message.findMany({
      where: { recipientId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        senderId: true,
        listingId: true,
        content: true,
        isRead: true,
        readAt: true,
        createdAt: true,
      },
    }),
    prisma.favorite.findMany({
      where: { userId: user.id, dealId: { not: null } },
      select: {
        dealId: true,
        createdAt: true,
        deal: { select: { title: true, slug: true } },
      },
    }),
    prisma.favorite.findMany({
      where: { userId: user.id, listingId: { not: null } },
      select: {
        listingId: true,
        createdAt: true,
        listing: { select: { title: true, slug: true } },
      },
    }),
    prisma.alert.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        keywords: true,
        categoryId: true,
        maxPrice: true,
        minPrice: true,
        cityId: true,
        type: true,
        notifyEmail: true,
        notifyPush: true,
        notifySms: true,
        isActive: true,
        lastMatchAt: true,
        matchCount: true,
        createdAt: true,
      },
    }),
    prisma.vote.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        dealId: true,
        value: true,
        createdAt: true,
      },
    }),
    prisma.notification.findMany({
      where: { userId: user.id, isRead: false },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        actionUrl: true,
        dealId: true,
        listingId: true,
        commentId: true,
        createdAt: true,
      },
    }),
  ]);

  const payload = {
    _meta: {
      version: "1.0",
      format: "application/json",
      exportedAt: new Date().toISOString(),
      userId: user.id,
      notice:
        "Cet export contient l'ensemble des données personnelles détenues par Péyi te concernant, au format JSON. Les IDs d'autres utilisateurs (senderId, recipientId) sont inclus pour la cohérence mais ne sont pas actionnables hors de la plateforme.",
    },
    profile,
    listings,
    deals,
    comments,
    messages: {
      sent: messagesSent,
      received: messagesReceived,
    },
    favorites: {
      deals: dealFavorites,
      listings: listingFavorites,
    },
    alerts,
    votes,
    notifications,
  };

  // Sérialisation manuelle pour pouvoir utiliser un indent lisible
  // (on priorise ici la lisibilité humaine plutôt que la taille brute —
  // c'est un export ponctuel, pas un flux temps réel).
  const body = JSON.stringify(payload, null, 2);

  // Nom de fichier : peyi-export-<username>-YYYY-MM-DD.json
  // On préfixe avec Péyi et la date pour que plusieurs exports d'un
  // même utilisateur puissent coexister sans se chevaucher dans le
  // dossier Téléchargements.
  const date = new Date().toISOString().slice(0, 10);
  const safeUsername = user.username.replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = `peyi-export-${safeUsername}-${date}.json`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
    },
  });
}
