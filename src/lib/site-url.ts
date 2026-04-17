/**
 * The canonical base URL of the running app. Used for building absolute
 * links in emails, OAuth redirects, and webhooks — anywhere we can't rely
 * on a request's Origin header.
 *
 * Set `NEXT_PUBLIC_SITE_URL` in `.env` to override. In dev, point it at
 * `http://localhost:3000`. In prod, point it at your deployed origin.
 */
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL;
  if (!raw) {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL is not set — add it to .env (e.g. http://localhost:3000).",
    );
  }
  return raw.replace(/\/$/, "");
}
