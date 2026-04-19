/**
 * Validation du format d'un code d'affiliation. Isolé dans son propre
 * fichier (zéro dépendance Node) pour pouvoir être importé depuis
 * l'Edge runtime du middleware — qui n'a pas accès à `node:crypto`.
 *
 * Les fonctions crypto (`hashIp`, `buildCandidateCode`) restent dans
 * `code.ts` et ne sont appelées que depuis des server components /
 * server actions / route handlers (runtime Node).
 */

const CODE_PATTERN = /^[a-z0-9]{1,20}-[A-Z0-9]{3,6}(?:-[A-Z0-9]{1,4})?$/;

export function isValidCodeFormat(code: string): boolean {
  if (code.length < 5 || code.length > 40) return false;
  return CODE_PATTERN.test(code);
}
