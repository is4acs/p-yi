/**
 * Panel de 12 personas Guyane utilisés pour attribuer les deals ingérés.
 *
 * Partagé entre `prisma/seed-dev.ts` (6 premiers) et l'ingest CLI
 * (`scripts/ingest/index.ts`) qui utilise les 12.
 *
 * Chaque persona a une "affinité" (liste de category slugs) : quand un
 * deal matche une de ces catégories, ce persona est candidat avec un
 * poids plus élevé. Ça évite l'effet "tous les deals tech postés par le
 * même compte" tout en gardant une cohérence de profil.
 */
import type { UserLevel } from "@prisma/client";

export type Persona = {
  username: string;
  fullName: string;
  citySlug: string;
  karma: number;
  bio?: string;
  affinity: string[];
};

export const PERSONAS: Persona[] = [
  {
    username: "marie973",
    fullName: "Marie L.",
    citySlug: "cayenne",
    karma: 1240,
    bio: "Maman de deux, je traque les bons plans courses à Cayenne.",
    affinity: ["tech-multimedia", "voyages-vols", "enfants-bebe"],
  },
  {
    username: "jeanpaul_kw",
    fullName: "Jean-Paul M.",
    citySlug: "kourou",
    karma: 520,
    bio: "Kourou. Bricolage, jardin, conteneurs.",
    affinity: ["bricolage-jardin", "arrivages-conteneurs", "sport-loisirs"],
  },
  {
    username: "sophie.mat",
    fullName: "Sophie R.",
    citySlug: "matoury",
    karma: 87,
    bio: "Nouvelle sur Péyi, j'adore chasser les promos.",
    affinity: ["tech-multimedia", "maison-electromenager"],
  },
  {
    username: "kevin_slm",
    fullName: "Kevin T.",
    citySlug: "saint-laurent-du-maroni",
    karma: 2180,
    bio: "Légende du West. Je fouine partout.",
    affinity: ["tech-multimedia", "maison-electromenager", "sport-loisirs"],
  },
  {
    username: "clara_remire",
    fullName: "Clara D.",
    citySlug: "remire-montjoly",
    karma: 340,
    bio: "Rémire, team courses saines et cosmétiques.",
    affinity: ["supermarche-alimentation", "mode-beaute", "gratuit-echantillons"],
  },
  {
    username: "david973",
    fullName: "David P.",
    citySlug: "cayenne",
    karma: 45,
    bio: "Débutant, je partage ce que je croise.",
    affinity: ["maison-electromenager", "supermarche-alimentation"],
  },
  {
    username: "nadia_kourou",
    fullName: "Nadia B.",
    citySlug: "kourou",
    karma: 780,
    bio: "Kourou. Maman-blogueuse, bébé & enfants.",
    affinity: ["enfants-bebe", "supermarche-alimentation", "mode-beaute"],
  },
  {
    username: "chris_cay",
    fullName: "Chris A.",
    citySlug: "cayenne",
    karma: 3250,
    bio: "Geek Cayenne. Tech, gaming, smartphones.",
    affinity: ["tech-multimedia"],
  },
  {
    username: "lydie.matoury",
    fullName: "Lydie F.",
    citySlug: "matoury",
    karma: 140,
    bio: "Matoury, passionnée déco et cuisine.",
    affinity: ["maison-electromenager", "supermarche-alimentation", "restos-sorties"],
  },
  {
    username: "yann_973",
    fullName: "Yann V.",
    citySlug: "remire-montjoly",
    karma: 960,
    bio: "Rémire. Sport, running, surf.",
    affinity: ["sport-loisirs", "restos-sorties"],
  },
  {
    username: "mama_cayenne",
    fullName: "Marthe S.",
    citySlug: "cayenne",
    karma: 1820,
    bio: "La cheffe des bons plans alim' à Cayenne.",
    affinity: ["supermarche-alimentation", "enfants-bebe", "gratuit-echantillons"],
  },
  {
    username: "kwdeals_gf",
    fullName: "Rudy G.",
    citySlug: "kourou",
    karma: 5420,
    bio: "Ambassadeur Péyi Kourou. Voyages, avions, conteneurs.",
    affinity: ["voyages-vols", "arrivages-conteneurs", "auto-moto-deals"],
  },
];

export function karmaLevel(karma: number): UserLevel {
  if (karma >= 5000) return "AMBASSADOR";
  if (karma >= 2000) return "LEGEND";
  if (karma >= 500) return "EXPERT";
  if (karma >= 200) return "HUNTER";
  if (karma >= 50) return "CURIOUS";
  return "BEGINNER";
}

/**
 * Route un candidat vers un persona en tenant compte de l'affinité.
 * Un persona avec affinité sur la catégorie a un poids ×3, sinon ×1.
 * Ça garantit de la variété tout en gardant des profils crédibles.
 */
export function pickAuthor(
  categorySlug: string,
  seed: string,
  personas: Persona[] = PERSONAS,
): Persona {
  const weights = personas.map((p) =>
    p.affinity.includes(categorySlug) ? 3 : 1,
  );
  const total = weights.reduce((a, b) => a + b, 0);
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  let r = h % total;
  for (let i = 0; i < personas.length; i++) {
    if (r < weights[i]) return personas[i];
    r -= weights[i];
  }
  return personas[0];
}
