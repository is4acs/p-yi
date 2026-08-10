import { Season } from "@prisma/client";

/**
 * Saisonnalité guyanaise : mapping mois → saison(s) en cours, et calcul
 * « praticable en ce moment » d'une activité.
 *
 * Découpage retenu (aligné sur les commentaires de l'enum Prisma) :
 *   - juillet → novembre : grande saison sèche
 *   - mars : petit été de mars (à l'intérieur de la saison des pluies —
 *     les deux saisons sont considérées actives ce mois-là)
 *   - décembre → juin : saison des pluies
 *
 * Les mois sont évalués dans le fuseau America/Cayenne (UTC-3) : un
 * serveur en UTC basculerait sinon de saison à 21h heure locale.
 */

const GUYANE_TZ = "America/Cayenne";

function monthInGuyane(date: Date): number {
  const formatted = new Intl.DateTimeFormat("fr-FR", {
    timeZone: GUYANE_TZ,
    month: "numeric",
  }).format(date);
  return Number.parseInt(formatted, 10) - 1; // 0-11
}

export function currentSeasons(date: Date = new Date()): Season[] {
  const month = monthInGuyane(date);
  if (month >= 6 && month <= 10) return [Season.MAIN_DRY_SEASON];
  if (month === 2) return [Season.SHORT_DRY_SEASON, Season.RAINY_SEASON];
  return [Season.RAINY_SEASON];
}

/**
 * Une activité est praticable si elle est marquée toute l'année (ou n'a
 * aucune saison renseignée — on ne pénalise pas une fiche incomplète), ou
 * si une de ses saisons correspond à la saison en cours.
 */
export function isPracticableNow(
  seasons: Season[],
  date: Date = new Date(),
): boolean {
  if (seasons.length === 0 || seasons.includes(Season.ALL_YEAR)) return true;
  const active = currentSeasons(date);
  return seasons.some((season) => active.includes(season));
}
