import { PrismaClient } from "@prisma/client";

// L'import de `env` déclenche la validation zod du `.env` au
// premier chargement de ce module. Comme 90% des fichiers serveur
// importent Prisma, ça garantit un fail-fast en cas de config
// cassée, quelle que soit la route touchée en premier.
import { env } from "@/lib/env";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
