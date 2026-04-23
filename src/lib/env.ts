import { z } from "zod";

/**
 * Validation des variables d'environnement au démarrage. Le but :
 * détecter une config cassée AVANT que l'application ne serve une
 * requête (fail-fast plutôt que 500 runtime opaques).
 *
 * Comment ça marche :
 *   1. Le schéma zod ci-dessous décrit chaque variable attendue
 *      avec son type et ses contraintes (URL valide, non-vide, etc.)
 *   2. `parseEnv()` est appelée à l'import — n'importe quel fichier
 *      qui fait `import { env } from "@/lib/env"` déclenche la
 *      validation. Les fichiers critiques (Prisma, Supabase,
 *      rate-limit) importent `env` pour garantir que la validation
 *      s'exécute en premier.
 *   3. Si une variable est manquante ou invalide, on throw un
 *      message humain qui liste TOUS les problèmes d'un coup
 *      (pas "fix one, rerun, fix next" — on veut tout voir vite).
 *
 * Niveaux de criticité :
 *   - **server** : variables requises pour le fonctionnement du
 *     serveur (DB, Supabase service key…). Sans elles, l'app ne
 *     peut pas démarrer. Validation stricte.
 *   - **prod-only** : Upstash Redis. Optionnel en dev/test (no-op
 *     limiter), obligatoire en production — `parseEnv` throw si
 *     `NODE_ENV=production` et qu'au moins une des deux variables
 *     manque. Échappatoire explicite : `ALLOW_NO_RATE_LIMIT=1`.
 *   - **publicRuntime** : variables injectées dans le bundle
 *     client (préfixe `NEXT_PUBLIC_`). Next ne les met à dispo
 *     que si elles existent au build, donc la validation sert
 *     surtout à éviter les valeurs placeholder oubliées.
 *   - **optional** : toggles, log level, overrides — ont une valeur
 *     par défaut si absents.
 *
 * Note : on n'inclut PAS les variables "roadmap" (Meilisearch, R2,
 * Resend, Twilio, Plausible, etc.) listées dans `.env.example` mais
 * pas encore utilisées. Dès qu'on branche une intégration, on ajoute
 * sa variable ici.
 */

// Sur le client, Next injecte uniquement les NEXT_PUBLIC_*. Pour
// éviter d'essayer de valider le reste côté navigateur (ce qui
// throwerait à chaque page view), on court-circuite et on ne
// valide que la partie publique.
const isServer = typeof window === "undefined";

const serverSchema = z.object({
  // Database (Prisma lit DATABASE_URL et DIRECT_URL implicitement).
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL manquante — lance `supabase` → Connect → Prisma"),
  DIRECT_URL: z
    .string()
    .min(1, "DIRECT_URL manquante — pour les migrations Prisma"),

  // Supabase côté serveur : ANON_KEY + SERVICE_ROLE_KEY.
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, "SUPABASE_SERVICE_ROLE_KEY manquante — Dashboard → Settings → API"),

  // Upstash Redis : rate limiting. REQUIS en production — sans, les
  // endpoints sensibles (auth, écriture, signalements, export RGPD)
  // tournent sans rate limit, ce qui ouvre la porte au brute-force,
  // au spam et au DoS de l'export. En dev/test on accepte l'absence
  // (le no-op de `rate-limit.ts` prend le relais).
  UPSTASH_REDIS_REST_URL: z
    .string()
    .url("UPSTASH_REDIS_REST_URL doit être une URL Upstash valide")
    .optional(),
  UPSTASH_REDIS_REST_TOKEN: z
    .string()
    .min(1, "UPSTASH_REDIS_REST_TOKEN manquant")
    .optional(),

  // Échappatoire explicite pour autoriser un boot prod SANS Upstash.
  // À n'utiliser que pour des situations exceptionnelles et auditées
  // (build CI sans accès aux secrets, environnement de démo isolé,
  // tests d'intégration éphémères). En production réelle, NE JAMAIS
  // mettre cette variable. La présence du flag est loggée fort pour
  // qu'on la voie passer dans les logs ops.
  ALLOW_NO_RATE_LIMIT: z
    .enum(["1", "true"])
    .optional(),

  // Node env (Next le pose, mais on valide le format).
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  // Log level — optionnel, defaults dans `src/lib/log.ts`.
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).optional(),
});

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url("NEXT_PUBLIC_SUPABASE_URL doit être l'URL du projet Supabase"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY manquante"),
  NEXT_PUBLIC_SITE_URL: z
    .string()
    .url("NEXT_PUBLIC_SITE_URL doit être une URL complète (ex. https://peyi.com)")
    .optional(),
});

type ServerEnv = z.infer<typeof serverSchema>;
type PublicEnv = z.infer<typeof publicSchema>;

function formatZodIssues(err: z.ZodError): string {
  return err.issues
    .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");
}

function parseEnv(): ServerEnv & PublicEnv {
  const publicParsed = publicSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  });

  if (!publicParsed.success) {
    throw new Error(
      `[env] Variables NEXT_PUBLIC_* invalides :\n${formatZodIssues(
        publicParsed.error,
      )}\nCopie .env.example en .env.local et remplis les valeurs.`,
    );
  }

  // Côté client, on s'arrête ici — les vars server ne sont pas
  // exposées au bundle navigateur, essayer de les parser
  // produirait "undefined" partout.
  if (!isServer) {
    return { ...publicParsed.data } as ServerEnv & PublicEnv;
  }

  const serverParsed = serverSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    ALLOW_NO_RATE_LIMIT: process.env.ALLOW_NO_RATE_LIMIT,
    NODE_ENV: process.env.NODE_ENV,
    LOG_LEVEL: process.env.LOG_LEVEL,
  });

  if (!serverParsed.success) {
    throw new Error(
      `[env] Variables serveur invalides :\n${formatZodIssues(
        serverParsed.error,
      )}\nVérifie .env ou les secrets du déploiement.`,
    );
  }

  if (
    serverParsed.data.NODE_ENV === "production" &&
    !publicParsed.data.NEXT_PUBLIC_SITE_URL
  ) {
    throw new Error(
      "[env] NEXT_PUBLIC_SITE_URL est obligatoire en production " +
        "(canonical, sitemap, OG URLs, redirects OAuth).",
    );
  }

  // En prod, Upstash est obligatoire. Sans rate limit, les endpoints
  // sensibles sont vulnérables (brute-force auth, spam d'écriture,
  // DoS de l'export RGPD). On refuse de booter pour forcer la prise
  // en compte. Échappatoire : ALLOW_NO_RATE_LIMIT=1 (situations
  // exceptionnelles uniquement, ex. build CI sans secrets).
  const upstashConfigured =
    Boolean(serverParsed.data.UPSTASH_REDIS_REST_URL) &&
    Boolean(serverParsed.data.UPSTASH_REDIS_REST_TOKEN);

  if (serverParsed.data.NODE_ENV === "production" && !upstashConfigured) {
    if (!serverParsed.data.ALLOW_NO_RATE_LIMIT) {
      throw new Error(
        "[env] UPSTASH_REDIS_REST_URL et UPSTASH_REDIS_REST_TOKEN sont " +
          "obligatoires en production (rate limiting). Sans, les endpoints " +
          "sensibles sont exposés au brute-force, spam et DoS.\n" +
          "→ Provisionne un Upstash Redis (free tier suffit) puis ajoute " +
          "les deux variables aux secrets du déploiement.\n" +
          "→ Pour autoriser un boot SANS rate limit (CI build, démo), " +
          "set ALLOW_NO_RATE_LIMIT=1 — à n'utiliser qu'en pleine connaissance.",
      );
    }
    // eslint-disable-next-line no-console
    console.warn(
      "[env] ⚠️ ALLOW_NO_RATE_LIMIT actif en production : aucun rate " +
        "limit appliqué. Mode acceptable uniquement pour build CI ou démo.",
    );
  }

  return { ...serverParsed.data, ...publicParsed.data };
}

export const env = parseEnv();
