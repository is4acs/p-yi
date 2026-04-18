import { logger } from "@/lib/log";

/**
 * Endpoint de collecte des erreurs client-side remontées par les
 * boundaries Next (`src/app/error.tsx`). Sans ça, un crash côté
 * navigateur ne laisse aucune trace côté serveur et on apprend
 * l'incident via un support user.
 *
 * Design :
 *   - `fire-and-forget` : on renvoie toujours 204, même si le
 *     payload est malformé ou si le log rate. Le client ne doit
 *     jamais retry — une erreur de reporting serait la cerise
 *     sur le gâteau.
 *   - Pas de DB : le log stdout suffit (même rationale que
 *     `/api/metrics`). L'observability pipeline gère la collecte.
 *   - Pas d'auth : les erreurs client sont anonymes par nature.
 *     Le risque de flood existe mais Vercel coupe à 1000 reqs/s
 *     par défaut sur un déploiement Hobby, largement suffisant.
 *
 * Champs attendus (tous optionnels — on prend ce qui arrive) :
 *   - `message` : Error.message
 *   - `digest`  : id de corrélation Next (permet de matcher avec
 *     l'erreur serveur originale qui a produit le RSC cassé)
 *   - `stack`   : Error.stack si disponible
 *   - `url`     : pathname + query au moment du crash
 */
export const runtime = "nodejs";

type ClientErrorBody = {
  message?: string;
  digest?: string;
  stack?: string;
  url?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ClientErrorBody;
    logger.error("client-error", {
      message: body.message ?? "unknown",
      digest: body.digest,
      // On tronque la stack pour éviter les logs obèses (même
      // contrainte que dans le logger côté serveur).
      stack: body.stack?.split("\n").slice(0, 20).join("\n"),
      url: body.url,
    });
  } catch {
    // Payload illisible → swallow, on renvoie quand même 204.
  }
  return new Response(null, { status: 204 });
}
