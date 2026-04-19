import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * Logo d'enseigne — affichage unifié pour `Store` et `Merchant`.
 *
 * Deux modes :
 *   - `logoUrl` fourni : <Image> next/image, contain, fond blanc pour
 *     préserver la lisibilité sur les logos à fond transparent.
 *   - `logoUrl` absent : monogramme (1-2 lettres dérivées du nom) sur
 *     un fond coloré stable (hash du nom → palette de 8 teintes). C'est
 *     un fallback "pas moche" pour les enseignes dont on n'a pas le
 *     logo officiel (petites chaînes Guyane).
 *
 * Source de vérité : le slug n'intervient jamais ici — on se base sur
 * `name` pour que la couleur reste stable même si le slug bouge.
 */

function monogramFrom(name: string): string {
  const words = name
    .split(/\s+/)
    .map((w) => w.replace(/[^a-zA-ZÀ-ÿ0-9]/g, ""))
    .filter((w) => w.length > 0);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

// Palette alignée sur les tokens Tailwind du design system. Toutes
// assez foncées pour passer le contraste AA avec du texte blanc.
const PALETTE = [
  "bg-peyi-orange-600",
  "bg-peyi-green-700",
  "bg-indigo-600",
  "bg-rose-600",
  "bg-teal-600",
  "bg-amber-700",
  "bg-purple-600",
  "bg-sky-700",
] as const;

function hashBg(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

type Props = {
  name: string;
  logoUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const SIZE_CLASSES: Record<NonNullable<Props["size"]>, string> = {
  sm: "h-5 w-5 text-[9px]",
  md: "h-8 w-8 text-xs",
  lg: "h-12 w-12 text-sm",
};

const SIZE_PX: Record<NonNullable<Props["size"]>, number> = {
  sm: 20,
  md: 32,
  lg: 48,
};

export function StoreLogo({ name, logoUrl, size = "sm", className }: Props) {
  const dims = SIZE_CLASSES[size];

  if (logoUrl) {
    const px = SIZE_PX[size];
    return (
      <span
        className={cn(
          "relative inline-block shrink-0 overflow-hidden rounded-sm bg-white ring-1 ring-border",
          dims,
          className,
        )}
      >
        <Image
          src={logoUrl}
          alt={name}
          fill
          sizes={`${px}px`}
          className="object-contain"
        />
      </span>
    );
  }

  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-sm font-display font-bold uppercase text-white",
        hashBg(name),
        dims,
        className,
      )}
    >
      {monogramFrom(name)}
    </span>
  );
}
