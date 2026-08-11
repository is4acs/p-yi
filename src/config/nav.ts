import {
  Compass,
  Flame,
  MessageSquare,
  Plus,
  Tag,
  User,
  type LucideIcon,
} from "lucide-react";

/**
 * Source de vérité UNIQUE de la navigation principale.
 *
 * Header desktop et BottomNav mobile consomment ce fichier — c'est la
 * garantie structurelle qu'ils ne peuvent plus diverger (l'incohérence
 * « Activités absent de la home » venait d'un déploiement obsolète, mais
 * les deux composants portaient bien chacun leur liste codée en dur :
 * le risque de divergence était réel).
 *
 * Deux surfaces, deux rôles (refonte « Soleil péyi ») :
 *
 *  - `VERTICAL_TABS` — les trois verticales de contenu, en onglets sous
 *    le wordmark, sur mobile comme sur desktop ;
 *  - `MOBILE_NAV` — la barre du bas, qui porte les destinations d'usage
 *    autour du bouton Poster central.
 *
 * Les deux listes dérivent du même registre `ITEMS`, ce qui interdit
 * structurellement qu'un libellé ou une URL diverge d'une surface à
 * l'autre.
 */

export type NavItem = {
  key: string;
  href: string;
  /** Libellé Header desktop. */
  label: string;
  /** Libellé BottomNav mobile (souvent plus court). */
  mobileLabel: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
  /** Onglet central mis en avant dans la BottomNav (bouton Poster). */
  primary?: boolean;
  /** Badge de non-lus à brancher sur ce lien. */
  badgeKey?: "unread";
};

const startsWith = (prefix: string) => (p: string) =>
  p === prefix || p.startsWith(`${prefix}/`);

const ITEMS = {
  bonsPlans: {
    key: "bons-plans",
    href: "/bons-plans",
    label: "Bons plans",
    mobileLabel: "Deals",
    icon: Flame,
    match: startsWith("/bons-plans"),
  },
  annonces: {
    key: "annonces",
    href: "/annonces",
    label: "Annonces",
    mobileLabel: "Annonces",
    icon: Tag,
    match: startsWith("/annonces"),
  },
  activites: {
    key: "activites",
    href: "/activites",
    label: "Activités",
    mobileLabel: "Activités",
    icon: Compass,
    match: startsWith("/activites"),
  },
  poster: {
    key: "poster",
    href: "/poster",
    label: "Poster",
    mobileLabel: "Poster",
    icon: Plus,
    match: (p: string) => p.startsWith("/poster"),
    primary: true,
  },
  messages: {
    key: "messages",
    href: "/messages",
    label: "Messages",
    mobileLabel: "Messages",
    icon: MessageSquare,
    match: startsWith("/messages"),
    badgeKey: "unread" as const,
  },
  profil: {
    key: "profil",
    href: "/profil",
    label: "Profil",
    mobileLabel: "Profil",
    icon: User,
    match: (p: string) => p.startsWith("/profil"),
  },
} satisfies Record<string, NavItem>;

/**
 * Les trois verticales de contenu, affichées en onglets sous le wordmark
 * — sur mobile comme sur desktop. C'est la navigation éditoriale : elle
 * dit de quoi parle le site, et elle est visible partout.
 *
 * Depuis la refonte « Soleil péyi », c'est ici qu'Activités vit. Elle
 * occupait auparavant une case de la barre du bas ; elle y était au
 * même rang que Profil ou Poster, alors que c'est une verticale de
 * contenu comme les deux autres. Le déplacement la remet à sa place et
 * libère la barre du bas pour Messages.
 */
export const VERTICAL_TABS: NavItem[] = [
  ITEMS.bonsPlans,
  ITEMS.annonces,
  ITEMS.activites,
];

/** Alias historique — le header desktop affiche les mêmes onglets. */
export const DESKTOP_NAV: NavItem[] = VERTICAL_TABS;

/**
 * Barre du bas mobile : 5 emplacements symétriques autour du bouton
 * Poster central. Ce sont les destinations d'usage (mes conversations,
 * mon profil), pas les verticales de contenu — celles-ci sont dans les
 * onglets hauts, présents sur le même écran.
 */
export const MOBILE_NAV: NavItem[] = [
  ITEMS.bonsPlans,
  ITEMS.annonces,
  ITEMS.poster,
  ITEMS.messages,
  ITEMS.profil,
];
