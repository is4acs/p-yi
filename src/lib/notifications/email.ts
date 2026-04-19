import { Resend } from "resend";

import { logger } from "@/lib/log";

/**
 * Mailer transactionnel via Resend.
 *
 * Config via env :
 *  - RESEND_API_KEY : clé API Resend (plan gratuit = 100 emails/jour)
 *  - EMAIL_FROM     : adresse d'envoi vérifiée dans Resend (ex. "Péyi
 *                     <no-reply@peyi.gf>"). Par défaut on fallback sur
 *                     "Péyi <onboarding@resend.dev>" qui marche en dev.
 *
 * Si `RESEND_API_KEY` n'est pas posé, `sendEmail` no-op + warning. En
 * dev, ça permet d'appeler l'API depuis le code sans devoir configurer
 * Resend. En prod on throw via `env.ts` si on voulait forcer, mais pour
 * MVP on reste en "soft" — l'email est un canal additionnel, pas le
 * chemin critique.
 *
 * Pattern d'usage :
 *   await sendEmail({
 *     to: user.email,
 *     subject: "Nouveau message sur Péyi",
 *     html: "<p>Coucou…</p>",
 *     text: "Coucou…",  // fallback clients anciens + anti-spam
 *   });
 */

const API_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.EMAIL_FROM || "Péyi <onboarding@resend.dev>";

let client: Resend | null = null;
function getClient(): Resend | null {
  if (!API_KEY) return null;
  if (!client) client = new Resend(API_KEY);
  return client;
}

export function isEmailConfigured(): boolean {
  return Boolean(API_KEY);
}

export type EmailPayload = {
  to: string | string[];
  subject: string;
  html: string;
  /** Version texte — améliore la délivrabilité et lit sur clients anciens. */
  text?: string;
  /** Tag logique pour suivi Resend (ex. "message-received", "tier-reached"). */
  tag?: string;
};

export async function sendEmail(
  payload: EmailPayload,
): Promise<{ id: string | null; skipped: boolean }> {
  const c = getClient();
  if (!c) {
    logger.warn("email.not-configured", { subject: payload.subject });
    return { id: null, skipped: true };
  }
  try {
    const res = await c.emails.send({
      from: FROM,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      tags: payload.tag ? [{ name: "type", value: payload.tag }] : undefined,
    });
    if ("error" in res && res.error) {
      logger.warn("email.send-failed", {
        subject: payload.subject,
        err: res.error.message,
      });
      return { id: null, skipped: false };
    }
    return { id: res.data?.id ?? null, skipped: false };
  } catch (err) {
    logger.error("email.send-threw", {
      subject: payload.subject,
      err: err instanceof Error ? err.message : String(err),
    });
    return { id: null, skipped: false };
  }
}
