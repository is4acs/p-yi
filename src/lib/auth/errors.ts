import type { Messages } from "@/lib/i18n";
import { tFormat } from "@/lib/i18n/tformat";

/**
 * Codes d'erreur du parcours connexion / création de compte.
 *
 * Les server actions et les routes (/auth/callback, /auth/confirm) ne
 * transportent JAMAIS de texte d'erreur libre : elles renvoient un CODE
 * de cette liste, traduit côté rendu via les dictionnaires. Deux
 * raisons :
 *
 *  1. Sécurité — l'ancien pattern `?error=<texte>` affichait n'importe
 *     quelle chaîne forgée dans l'alerte officielle de la page de
 *     connexion (« Ton compte a été piraté, appelle le… ») : un vecteur
 *     de phishing gratuit. Un code inconnu retombe désormais sur un
 *     message générique.
 *  2. i18n — les messages suivent la langue de l'interface (fr/pt/ht)
 *     au lieu d'être figés en français au moment du redirect.
 */
export const AUTH_ERROR_CODES = [
  "rate_limited",
  "invalid_form",
  "email_unconfirmed",
  "invalid_credentials",
  "signin_failed",
  "username_taken",
  "email_taken",
  "signup_failed",
  "link_invalid",
  "cookies_blocked",
  "google_failed",
  "password_same",
  "update_failed",
] as const;

export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[number];

export function isAuthErrorCode(value: unknown): value is AuthErrorCode {
  return (
    typeof value === "string" &&
    (AUTH_ERROR_CODES as readonly string[]).includes(value)
  );
}

/**
 * État renvoyé par les server actions du parcours auth (useActionState).
 * `error: null` = repos ou succès ; `sent`/`done` portent les succès
 * intermédiaires (e-mail de confirmation envoyé, mot de passe mis à
 * jour) sans navigation — le formulaire garde la saisie de
 * l'utilisateur, contrairement à l'ancien pattern redirect-avec-erreur
 * qui vidait tous les champs.
 */
export type AuthFormState = {
  error: AuthErrorCode | null;
  /** Pour `rate_limited` : secondes à attendre avant de réessayer. */
  retryAfterSeconds?: number;
  /** Inscription : e-mail de confirmation envoyé. */
  sent?: boolean;
  /** Reset : mot de passe mis à jour. */
  done?: boolean;
};

export const AUTH_FORM_IDLE: AuthFormState = { error: null };

/** État `rate_limited` à partir du timestamp `reset` d'Upstash. */
export function rateLimitedState(reset: number): AuthFormState {
  return {
    error: "rate_limited",
    retryAfterSeconds: Math.max(1, Math.ceil((reset - Date.now()) / 1000)),
  };
}

/**
 * Message humain d'un état d'erreur, dans la langue de l'interface.
 * Pur (utilisable côté client comme côté serveur). Renvoie null si
 * l'état ne porte pas d'erreur.
 */
export function authErrorMessage(
  t: Messages,
  state: Pick<AuthFormState, "error" | "retryAfterSeconds">,
): string | null {
  const { error } = state;
  if (!error) return null;

  if (error === "rate_limited") {
    const seconds = state.retryAfterSeconds ?? 60;
    return seconds >= 60
      ? tFormat(t.auth.errors.rateLimitedMin, { n: Math.ceil(seconds / 60) })
      : tFormat(t.auth.errors.rateLimitedSec, { n: seconds });
  }

  const map: Record<Exclude<AuthErrorCode, "rate_limited">, string> = {
    invalid_form: t.auth.errors.invalidForm,
    email_unconfirmed: t.auth.errors.emailUnconfirmed,
    invalid_credentials: t.auth.errors.invalidCredentials,
    signin_failed: t.auth.errors.signinFailed,
    username_taken: t.auth.errors.usernameTaken,
    email_taken: t.auth.errors.emailTaken,
    signup_failed: t.auth.errors.signupFailed,
    link_invalid: t.auth.errors.linkInvalid,
    cookies_blocked: t.auth.errors.cookiesBlocked,
    google_failed: t.auth.errors.googleFailed,
    password_same: t.auth.errors.passwordSame,
    update_failed: t.auth.errors.updateFailed,
  };
  return map[error];
}
