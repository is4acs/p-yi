import { PrismaClient } from "@prisma/client";

// L'import de `env` déclenche la validation zod du `.env` au
// premier chargement de ce module. Comme 90% des fichiers serveur
// importent Prisma, ça garantit un fail-fast en cas de config
// cassée, quelle que soit la route touchée en premier.
import { env } from "@/lib/env";

/**
 * Prisma ouvre par défaut **3** connexions vers la DB quand on utilise
 * un pooler (Supabase pooler / PgBouncer). Sur Vercel serverless ce
 * plafond est trop bas : le build prerender le sitemap en parallèle
 * et sature le pool en quelques secondes → `P2024: Timed out fetching
 * a new connection`, build échoue, et site inaccessible au runtime
 * dès qu'il y a une poignée de visiteurs concurrents.
 *
 * On élève le plafond à 20 connexions et on pousse le `pool_timeout`
 * à 30s. Valeurs sûres sous les limites Supabase. On NE surcharge
 * PAS si l'URL a déjà ses propres paramètres — l'utilisateur décide.
 */
function ensurePoolParams(url: string): string {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    if (!parsed.searchParams.has("connection_limit")) {
      parsed.searchParams.set("connection_limit", "20");
    }
    if (!parsed.searchParams.has("pool_timeout")) {
      parsed.searchParams.set("pool_timeout", "30");
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: { url: ensurePoolParams(env.DATABASE_URL) },
    },
    log:
      env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
