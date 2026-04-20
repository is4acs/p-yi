"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { NotificationType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/auth/current-user";
import { createMessageSchema } from "@/lib/validation/message";
import { writeLimiter } from "@/lib/rate-limit";
import { dispatchNotification } from "@/lib/notifications/dispatch";

function redirectWithError(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function formatRateLimitMessage(reset: number): string {
  const secondsLeft = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
  if (secondsLeft >= 60) {
    return `Trop de messages envoyés. Réessaye dans ${Math.ceil(secondsLeft / 60)} min.`;
  }
  return `Trop de messages envoyés. Réessaye dans ${secondsLeft}s.`;
}

/**
 * Send a private message.
 *
 * If `listingSlug` is provided, the message is scoped to that listing so the
 * inbox shows separate threads when the same two users discuss several items.
 *
 * Rules :
 *  - Authenticated users only.
 *  - Self-messaging is rejected.
 *  - When a listing is specified, the recipient MUST be its author — this
 *    prevents spamming random users via somebody else's listing URL.
 *  - The listing's `allowMessages` flag must be true.
 *  - `listing.contactCount` is incremented.
 *  - A NEW_MESSAGE notification is created for the recipient.
 *  - The sender is redirected to the thread page.
 */
export async function sendMessageAction(formData: FormData): Promise<void> {
  const user = await requireActiveUser("/messages");

  // Rate limit par expéditeur — principal vecteur de spam DM.
  const { success, reset } = await writeLimiter.limit(
    `message:send:${user.id}`,
  );
  if (!success) {
    const rawRecipient = formData.get("recipientUsername");
    const rawListing = formData.get("listingSlug");
    const fallback =
      typeof rawRecipient === "string" && rawRecipient
        ? `/messages/${encodeURIComponent(rawRecipient)}${
            typeof rawListing === "string" && rawListing
              ? `?listing=${encodeURIComponent(rawListing)}`
              : ""
          }`
        : "/messages";
    redirectWithError(fallback, formatRateLimitMessage(reset));
  }

  const parsed = createMessageSchema.safeParse({
    recipientUsername: formData.get("recipientUsername"),
    listingSlug: formData.get("listingSlug") ?? undefined,
    content: formData.get("content"),
  });

  const rawRecipient = formData.get("recipientUsername");
  const rawListing = formData.get("listingSlug");
  const fallbackPath =
    typeof rawRecipient === "string" && rawRecipient
      ? `/messages/${encodeURIComponent(rawRecipient)}${
          typeof rawListing === "string" && rawListing
            ? `?listing=${encodeURIComponent(rawListing)}`
            : ""
        }`
      : "/messages";

  if (!parsed.success) {
    redirectWithError(
      fallbackPath,
      parsed.error.issues[0]?.message ?? "Message invalide.",
    );
  }
  const data = parsed.data;

  const recipient = await prisma.user.findUnique({
    where: { username: data.recipientUsername },
    select: { id: true, username: true },
  });
  if (!recipient) {
    redirectWithError("/messages", "Destinataire introuvable.");
  }
  if (recipient.id === user.id) {
    redirectWithError(
      "/messages",
      "Tu ne peux pas t'envoyer de message à toi-même.",
    );
  }

  let listingId: string | null = null;
  let listingSlug: string | null = null;
  if (data.listingSlug) {
    const listing = await prisma.listing.findFirst({
      where: { slug: data.listingSlug },
      select: {
        id: true,
        slug: true,
        authorId: true,
        allowMessages: true,
      },
    });
    if (!listing) {
      redirectWithError(
        `/messages/${recipient.username}`,
        "Annonce introuvable.",
      );
    }
    if (listing.authorId !== recipient.id) {
      redirectWithError(
        `/messages/${recipient.username}`,
        "Cette annonce n'appartient pas à ce vendeur.",
      );
    }
    if (!listing.allowMessages) {
      redirectWithError(
        `/annonces/${listing.slug}`,
        "Le vendeur n'a pas activé la messagerie pour cette annonce.",
      );
    }
    listingId = listing.id;
    listingSlug = listing.slug;
  }

  // Create message + bump contactCount atomically. La notification est
  // dispatchée hors transaction via dispatchNotification (in-app + push
  // + email) pour que l'échec d'un canal de notif n'annule pas
  // l'insertion du message.
  await prisma.$transaction(async (tx) => {
    await tx.message.create({
      data: {
        senderId: user.id,
        recipientId: recipient.id,
        listingId,
        content: data.content,
      },
    });

    if (listingId) {
      await tx.listing.update({
        where: { id: listingId },
        data: { contactCount: { increment: 1 } },
      });
    }
  });

  const preview =
    data.content.length > 140
      ? `${data.content.slice(0, 140).trimEnd()}…`
      : data.content;

  const actionPath = listingSlug
    ? `/messages/${user.username}?listing=${listingSlug}`
    : `/messages/${user.username}`;

  // dispatchNotification ne throw jamais — safe to fire-and-forget
  // sans casser l'UX côté expéditeur.
  await dispatchNotification({
    userId: recipient.id,
    type: NotificationType.NEW_MESSAGE,
    title: `Nouveau message de @${user.username}`,
    message: preview,
    actionPath,
    listingId,
    fromUserId: user.id,
    // Un thread = un tag → les pushs successifs remplacent au lieu
    // d'empiler, conforme au comportement iMessage / WhatsApp.
    pushTag: `dm:${[user.id, recipient.id].sort().join(":")}`,
  });

  revalidatePath("/messages");
  revalidatePath(`/messages/${recipient.username}`);
  if (listingSlug) {
    revalidatePath(`/annonces/${listingSlug}`);
    revalidateTag(`listing:${listingSlug}`);
  }

  const threadPath = listingSlug
    ? `/messages/${recipient.username}?listing=${listingSlug}`
    : `/messages/${recipient.username}`;
  redirect(threadPath);
}
