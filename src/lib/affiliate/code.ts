import { createHash, randomBytes } from "node:crypto";

import { prisma } from "@/lib/prisma";

/**
 * Génération de codes d'affiliation lisibles. Format : `<username>-<4chars>`,
 * où `<4chars>` est une suite alphanumérique sans ambiguïté (pas de 0/O, 1/l,
 * etc.) pour éviter les erreurs de saisie quand quelqu'un relaie le code à
 * l'oral. On reste court (8-16 chars) pour que le lien soit partageable.
 *
 * Le code est unique par utilisateur — deux parrains ne peuvent jamais
 * partager le même code, même si leurs pseudos sont proches.
 */

const UNAMBIGUOUS_CHARS = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // 31 chars
const CODE_SUFFIX_LENGTH = 4;

/**
 * Slugifie un pseudo en minuscules + ASCII + caractères sûrs pour une URL.
 * `@Marie_973` → `marie973`.
 */
function slugifyUsername(username: string): string {
  return username
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 20) || "user";
}

/**
 * Tire un suffixe alphanumérique de `length` caractères sans ambiguïté
 * visuelle. Utilise `randomBytes` (CSPRNG) pour que le code ne soit pas
 * devinable à partir de celui d'un voisin.
 */
function randomSuffix(length: number = CODE_SUFFIX_LENGTH): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += UNAMBIGUOUS_CHARS[bytes[i]! % UNAMBIGUOUS_CHARS.length];
  }
  return out;
}

/**
 * Construit un code candidat `<slug>-<XXXX>` à partir d'un pseudo.
 */
export function buildCandidateCode(username: string): string {
  return `${slugifyUsername(username)}-${randomSuffix()}`;
}

/**
 * Génère un code unique garanti en vérifiant la collision en base. On
 * réessaie jusqu'à 8 fois avant d'abandonner (probabilité d'échec à 8
 * tentatives : ~0 sur 31^4 = 923 521 suffixes possibles par pseudo).
 */
export async function generateUniqueAffiliateCode(
  username: string,
): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = buildCandidateCode(username);
    const taken = await prisma.affiliateProfile.findUnique({
      where: { code: candidate },
      select: { id: true },
    });
    if (!taken) return candidate;
  }
  // Fallback rarissime : on appose un second suffixe pour garantir l'unicité.
  return `${buildCandidateCode(username)}-${randomSuffix(2)}`;
}

/**
 * Valide grossièrement le format d'un code reçu en query string. Évite les
 * injections et les requêtes inutiles : si le code ne matche pas le
 * pattern, on skippe sans toucher la DB.
 */
const CODE_PATTERN = /^[a-z0-9]{1,20}-[A-Z0-9]{3,6}(?:-[A-Z0-9]{1,4})?$/;

export function isValidCodeFormat(code: string): boolean {
  if (code.length < 5 || code.length > 40) return false;
  return CODE_PATTERN.test(code);
}

/**
 * Hash SHA-256 d'une IP pour le tracking anti-fraude sans stocker l'IP en
 * clair (conformité RGPD). Le hash inclut un sel dérivé du code pour
 * empêcher les correspondances croisées entre parrains.
 */
export function hashIp(ip: string, salt: string = ""): string {
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}
