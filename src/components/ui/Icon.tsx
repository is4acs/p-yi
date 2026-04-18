import * as React from "react";

/**
 * Icon — set d'icônes Peyi v1.0 (handoff design system).
 *
 * Spec :
 *  - Grille 24×24, trait 2px, style outline, `color: currentColor`
 *  - `aria-hidden="true"` par défaut (icône décorative). Si l'icône
 *    porte une information (ex : seule à l'intérieur d'un bouton sans
 *    libellé), ajoutez un `aria-label` sur le parent ou passez
 *    `aria-hidden={false}` + `role="img"` + `aria-label` sur le `<svg>`.
 *
 * Cohabitation avec `lucide-react` (utilisé dans 60+ fichiers) :
 *  - Ce composant expose les icônes **marquées Peyi** : catégories
 *    Guyane (home, car, job, event, food, service), flag-star (étoile
 *    pleine signature "coup de cœur"), et quelques icônes UI alignées
 *    sur notre style de trait.
 *  - Pour tout le reste (ChevronDown, Upload, ArrowLeft, Share2, …),
 *    continuez d'utiliser `lucide-react`. Pas de migration big bang.
 *  - Règle : si l'icône apparaît sur la home, dans un CategoryTile ou
 *    sur une pastille "coup de cœur", utilisez `Icon` pour garder le
 *    trait cohérent. Ailleurs, `lucide` reste OK.
 *
 * Usage :
 * ```tsx
 * <Icon name="search" size={20} className="text-peyi-orange-600" />
 * <button aria-label="Favoris">
 *   <Icon name="heart" />
 * </button>
 * ```
 */
export type IconName =
  // Catégories — grille home / CategoryTile
  | "home"
  | "car"
  | "job"
  | "event"
  | "food"
  | "service"
  // Recherche & filtres
  | "search"
  | "pin"
  | "filter"
  | "sliders"
  | "sort"
  | "mic"
  | "camera"
  | "grid"
  | "list"
  | "map"
  | "recent"
  | "trending"
  | "flag-star"
  // UI
  | "heart"
  | "tag"
  | "chat"
  | "user"
  | "bell"
  | "star"
  | "plus"
  | "check"
  | "close"
  | "arrow-right"
  | "clock"
  | "euro";

interface IconProps extends React.SVGAttributes<SVGSVGElement> {
  name: IconName;
  size?: number | string;
}

export const Icon: React.FC<IconProps> = ({
  name,
  size = 24,
  "aria-hidden": ariaHidden = true,
  ...rest
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden={ariaHidden}
    {...rest}
  >
    {PATHS[name]}
  </svg>
);

Icon.displayName = "Icon";

// ── Définitions de paths ────────────────────────────────────────────────
// Paths issus du handoff `icons-react.tsx` v1.0 (design avril 2026).
// Ne pas modifier sans re-synchroniser avec le handoff — le sprite
// `public/icons.svg` doit rester identique (même tracés, même viewBox).
const PATHS: Record<IconName, React.ReactNode> = {
  // Catégories
  home: <path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1Z" />,
  car: (
    <>
      <path d="M3 16V12l2-5a2 2 0 0 1 2-1h10a2 2 0 0 1 2 1l2 5v4m-18 0h18m-15 0v2a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-2m9 0v2a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-2" />
      <circle cx="7.5" cy="16" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="16.5" cy="16" r="1.5" fill="currentColor" stroke="none" />
    </>
  ),
  job: <path d="M3 7h18v13H3zM8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18" />,
  event: <path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4" />,
  food: (
    <path d="M4 11h16v2a7 7 0 0 1-7 7h-2a7 7 0 0 1-7-7v-2ZM7 8c0-2 2-2 2-4M12 8c0-2 2-2 2-4M17 8c0-2 2-2 2-4M2 20h20" />
  ),
  service: (
    <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.8 2.8-2.2-2.2 2.8-2.6Z" />
  ),

  // Recherche & filtres
  search: <path d="M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm10 2-4.5-4.5" />,
  pin: (
    <>
      <path d="M12 22s-7-7.58-7-13a7 7 0 1 1 14 0c0 5.42-7 13-7 13Z" />
      <circle cx="12" cy="9" r="2.5" />
    </>
  ),
  filter: <path d="M3 5h18l-7 9v6l-4-2v-4L3 5Z" />,
  sliders: (
    <>
      <path d="M4 7h10M18 7h2M4 17h2M10 17h10M4 12h6M14 12h6" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="8" cy="17" r="2" />
      <circle cx="12" cy="12" r="2" />
    </>
  ),
  sort: <path d="M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4" />,
  mic: (
    <>
      <rect x="9" y="3" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" />
    </>
  ),
  camera: (
    <>
      <path d="M3 8h4l2-3h6l2 3h4v12H3z" />
      <circle cx="12" cy="13" r="4" />
    </>
  ),
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  list: (
    <>
      <path d="M8 6h13M8 12h13M8 18h13" />
      <circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none" />
    </>
  ),
  map: (
    <>
      <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z" />
      <path d="M9 4v14M15 6v14" />
    </>
  ),
  recent: (
    <>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" />
      <path d="M12 8v5l3 2" />
    </>
  ),
  trending: <path d="M3 17 9 11l4 4 8-8M14 5h7v7" />,
  "flag-star": (
    <path
      d="m12 2 2.6 7.3 7.7.3-6.1 4.7 2.1 7.4L12 17.3 5.7 21.7l2.1-7.4L1.7 9.6l7.7-.3z"
      fill="currentColor"
      stroke="none"
    />
  ),

  // UI
  heart: (
    <path d="M12 21s-7-4.5-9.5-9.2C.9 8.5 2.6 4.5 6.5 4.5c2 0 3.5 1 4.5 2.5 1-1.5 2.5-2.5 4.5-2.5 3.9 0 5.6 4 4 7.3C19 16.5 12 21 12 21Z" />
  ),
  tag: (
    <>
      <path d="M3 12V4h8l10 10-8 8L3 12Z" />
      <circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none" />
    </>
  ),
  chat: <path d="M4 5h16v12H8l-4 4V5Z" />,
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  bell: <path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4l2-2ZM10 20a2 2 0 0 0 4 0" />,
  star: (
    <path
      d="m12 3 2.9 6 6.5.9-4.7 4.6 1.1 6.5L12 18l-5.8 3 1.1-6.5L2.6 9.9 9.1 9Z"
      fill="currentColor"
      stroke="none"
    />
  ),
  plus: <path d="M12 5v14M5 12h14" strokeWidth={2.5} />,
  check: <path d="M4 12l5 5L20 6" strokeWidth={2.5} />,
  close: <path d="M6 6l12 12M18 6 6 18" strokeWidth={2.5} />,
  "arrow-right": <path d="M5 12h14M13 6l6 6-6 6" strokeWidth={2.5} />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  euro: <path d="M19 6a8 8 0 1 0 0 12M4 10h10M4 14h10" />,
};

export default Icon;
