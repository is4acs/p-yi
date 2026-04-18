/**
 * Logger structuré minimal. L'objectif : avoir un point unique pour
 * émettre des logs JSON-ligne, exploitables par n'importe quel
 * collecteur (Vercel logs, Datadog, Grafana Loki, fly.io, Railway,
 * stdout piped to a SIEM, etc.) sans dépendance lourde.
 *
 * Format : une entrée par ligne, JSON pur, avec `timestamp`, `level`,
 * `message` et un `context` optionnel. C'est le format attendu par
 * 99% des outils de log analysis — pas de parsing custom à faire.
 *
 *   { "timestamp":"2026-04-17T10:30:00.000Z", "level":"info",
 *     "message":"user-signup", "context":{"userId":"abc-123"} }
 *
 * Usage :
 *   import { logger } from "@/lib/log";
 *   logger.info("user-signup", { userId: user.id });
 *   logger.error("prisma-failed", { op: "listing.create", err });
 *
 * Règles :
 *   - Message court, en kebab-case, représente le TYPE d'événement
 *     (pas une phrase). Ça facilite le groupement côté collecteur.
 *   - Contexte = toute donnée utile à la corrélation. Jamais de
 *     secret (mot de passe, token JWT, clé API) — le logger ne
 *     fait pas de redaction, à l'appelant de filtrer.
 *   - `Error` dans le contexte : on sérialise proprement (stack,
 *     message, name) via `serializeError`.
 *
 * Niveaux :
 *   - debug : verbose, désactivé par défaut en prod (LOG_LEVEL=debug)
 *   - info  : événement métier normal (signup, vote, publication…)
 *   - warn  : comportement dégradé non bloquant (rate limit hit,
 *             tentative échouée, retry…)
 *   - error : exception, opération échouée, à investiguer
 */

type LogLevel = "debug" | "info" | "warn" | "error";
type LogContext = Record<string, unknown>;

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

// Seuil configurable via env. En dev par défaut on garde "debug",
// en prod on coupe à "info" pour éviter le bruit (et la facture
// Datadog).
function currentThreshold(): number {
  const raw = process.env.LOG_LEVEL?.toLowerCase();
  if (raw && raw in LEVEL_WEIGHT) {
    return LEVEL_WEIGHT[raw as LogLevel];
  }
  return process.env.NODE_ENV === "production"
    ? LEVEL_WEIGHT.info
    : LEVEL_WEIGHT.debug;
}

function serializeError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      // Stack en prod est utile, mais on le tronque pour éviter les
      // logs obèses sur les stacks récursives.
      stack: err.stack?.split("\n").slice(0, 20).join("\n"),
    };
  }
  return { value: err };
}

// Normalise le contexte : toute instance d'Error est remplacée par
// un objet sérialisable. On conserve les autres clés telles quelles.
function normalizeContext(ctx?: LogContext): LogContext | undefined {
  if (!ctx) return undefined;
  const out: LogContext = {};
  for (const [key, value] of Object.entries(ctx)) {
    if (value instanceof Error) {
      out[key] = serializeError(value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

function emit(level: LogLevel, message: string, context?: LogContext) {
  if (LEVEL_WEIGHT[level] < currentThreshold()) return;

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(context ? { context: normalizeContext(context) } : {}),
  };

  // On choisit la méthode console selon le niveau pour que les
  // systèmes qui distinguent stdout / stderr voient la bonne sévérité.
  const line = JSON.stringify(entry);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  debug: (message: string, context?: LogContext) =>
    emit("debug", message, context),
  info: (message: string, context?: LogContext) =>
    emit("info", message, context),
  warn: (message: string, context?: LogContext) =>
    emit("warn", message, context),
  error: (message: string, context?: LogContext) =>
    emit("error", message, context),
};
