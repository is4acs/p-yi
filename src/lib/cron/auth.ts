import { env } from "@/lib/env";

/**
 * Auth partagée des handlers `/api/cron/*`.
 *
 * Vercel appelle les crons déclarés dans `vercel.json` avec le header
 * `Authorization: Bearer <CRON_SECRET>`. On compare au secret défini
 * côté déploiement — sans ça, n'importe qui pourrait déclencher les
 * jobs de maintenance à la main (dont la purge, qui supprime).
 *
 * En dev local, pas de secret = on autorise, pour pouvoir tester les
 * handlers au `curl`. En production, pas de secret = on refuse tout
 * (fail-closed) : mieux vaut un cron qui ne tourne pas qu'un endpoint
 * destructif ouvert à tous.
 */
export function isCronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return env.NODE_ENV !== "production";
  return req.headers.get("authorization") === `Bearer ${secret}`;
}
