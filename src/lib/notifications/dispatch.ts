import { NotificationType, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/log";
import { getSiteUrl } from "@/lib/site-url";

import { sendPushToUser, type PushPayload } from "./push";
import { sendEmail } from "./email";

/**
 * dispatchNotification — point d'entrée unique pour notifier un user.
 *
 * Effet :
 *   1. Crée (toujours) une ligne `Notification` en DB → visible dans
 *      la cloche + /notifications
 *   2. Envoie un push natif si le user a activé `notificationSettings.push`
 *   3. Envoie un email si `notificationSettings.email`
 *
 * Best-effort : chaque canal est appelé en try/catch — si Resend tombe
 * ou si un endpoint push est mort, on log et on continue. L'event
 * métier ne doit JAMAIS échouer à cause d'un canal de notif.
 *
 * `notificationSettings` est un JSON libre sur User, typé ici pour
 * éviter les `any`. Les clés reconnues :
 *   - push: boolean (défaut true)
 *   - email: boolean (défaut true)
 *   - newDeals: boolean (tagué mais pas encore utilisé ici)
 *   - alertsMatch: boolean (idem)
 */

type UserPrefs = {
  push?: boolean;
  email?: boolean;
};

function parsePrefs(raw: Prisma.JsonValue | null): UserPrefs {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const obj = raw as Record<string, unknown>;
  return {
    push: obj.push === false ? false : true,
    email: obj.email === false ? false : true,
  };
}

export type DispatchInput = {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  /** Chemin relatif (ex. `/bons-plans/xyz#comment-abc`). Converti en URL
   *  absolue pour l'email et le deep-link push. */
  actionPath?: string;
  dealId?: string | null;
  listingId?: string | null;
  commentId?: string | null;
  fromUserId?: string | null;
  /** Identifiant logique pour dédupliquer les pushs (ex. thread id). */
  pushTag?: string;
  /** HTML de l'email (optionnel) — si omis, on génère un gabarit basique
   *  à partir du title + message + bouton vers actionPath. */
  emailHtml?: string;
};

const BASE_EMAIL_STYLE = `
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: #1a202c; line-height: 1.55; max-width: 560px; margin: 0 auto;
`;

function renderDefaultEmailHtml(input: {
  title: string;
  message: string;
  actionUrl?: string;
}): string {
  const cta = input.actionUrl
    ? `<p style="margin-top:24px;">
         <a href="${input.actionUrl}"
            style="display:inline-block;padding:10px 20px;background:#F97316;
                   color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">
           Voir sur Péyi
         </a>
       </p>`
    : "";
  return `
    <div style="${BASE_EMAIL_STYLE}">
      <h1 style="font-size:20px;margin-bottom:8px;">${escapeHtml(input.title)}</h1>
      <p style="font-size:14px;color:#4a5568;white-space:pre-line;">${escapeHtml(input.message)}</p>
      ${cta}
      <p style="margin-top:32px;font-size:12px;color:#a0aec0;">
        Tu reçois cet email parce que tu es inscrit(e) sur Péyi.
        Pour ne plus recevoir ce genre d'email, modifie tes préférences
        depuis <a href="${getSiteUrl()}/profil/edit" style="color:#F97316;">ton profil</a>.
      </p>
    </div>
  `;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function dispatchNotification(input: DispatchInput): Promise<void> {
  // 1. Récupère email + prefs du destinataire. Si le user n'existe plus
  // (cascade delete), on abandonne silencieusement.
  const recipient = await prisma.user.findUnique({
    where: { id: input.userId },
    select: {
      id: true,
      email: true,
      notificationSettings: true,
      isBanned: true,
    },
  });
  if (!recipient || recipient.isBanned) return;

  const prefs = parsePrefs(recipient.notificationSettings);
  const actionUrl = input.actionPath
    ? `${getSiteUrl()}${input.actionPath}`
    : undefined;

  // 2. Notification DB — always-on (une trace doit toujours rester dans
  // l'app même si email+push sont off).
  try {
    await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        actionUrl: input.actionPath ?? null,
        dealId: input.dealId ?? null,
        listingId: input.listingId ?? null,
        commentId: input.commentId ?? null,
        fromUserId: input.fromUserId ?? null,
      },
    });
  } catch (err) {
    // Si même la row DB échoue, on n'envoie ni push ni email — tu n'as
    // déjà plus de trace, autant ne pas spammer en plus.
    logger.error("dispatch.notification.db-failed", {
      userId: input.userId,
      type: input.type,
      err: err instanceof Error ? err.message : String(err),
    });
    return;
  }

  // 3. Push — si activé. sendPushToUser gère en interne le no-op
  // quand VAPID n'est pas configuré (dev ou rollback push).
  if (prefs.push !== false) {
    const pushPayload: PushPayload = {
      title: input.title,
      body: input.message.length > 200
        ? `${input.message.slice(0, 200).trimEnd()}…`
        : input.message,
      url: input.actionPath,
      tag: input.pushTag,
    };
    sendPushToUser(input.userId, pushPayload).catch((err) => {
      logger.warn("dispatch.push.failed", {
        userId: input.userId,
        err: err instanceof Error ? err.message : String(err),
      });
    });
  }

  // 4. Email — si activé. Idem no-op si RESEND_API_KEY absent.
  if (prefs.email !== false) {
    const html =
      input.emailHtml ??
      renderDefaultEmailHtml({
        title: input.title,
        message: input.message,
        actionUrl,
      });
    sendEmail({
      to: recipient.email,
      subject: input.title,
      html,
      text: input.message,
      tag: input.type,
    }).catch((err) => {
      logger.warn("dispatch.email.failed", {
        userId: input.userId,
        err: err instanceof Error ? err.message : String(err),
      });
    });
  }
}
