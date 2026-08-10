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
 * Les deux surfaces n'affichent PAS le même sous-ensemble, par choix
 * produit : la BottomNav garde 5 onglets symétriques autour du bouton
 * Poster (Messages y cède sa place à Activités, la messagerie restant
 * accessible via le Header et le Profil) ; le Header n'affiche pas
 * Profil (l'avatar joue ce rôle). D'où les listes DESKTOP_NAV /
 * MOBILE_NAV dérivées du même registre.
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

export const DESKTOP_NAV: NavItem[] = [
  ITEMS.bonsPlans,
  ITEMS.annonces,
  ITEMS.activites,
  ITEMS.poster,
  ITEMS.messages,
];

export const MOBILE_NAV: NavItem[] = [
  ITEMS.activites,
  ITEMS.bonsPlans,
  ITEMS.poster,
  ITEMS.annonces,
  ITEMS.profil,
];
