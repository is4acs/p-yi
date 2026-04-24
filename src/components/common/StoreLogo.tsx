import Image from "next/image";

import { cn } from "@/lib/utils";
import { isRenderableImageUrl } from "@/lib/images";

/**
 * Logo d'enseigne — `next/image` avec fond blanc (contain) pour
 * préserver la lisibilité sur les logos à fond transparent.
 *
 * Fallback : quand `logoUrl` est absent, on ne rend rien (`null`).
 * Les appelants qui veulent malgré tout un repère visuel affichent
 * une icône générique (ex. `Store` de lucide). On a retiré le
 * monogramme à initiales (« BC » pour BUT Cayenne, etc.) qui
 * parasitait visuellement les cartes sans apporter d'information.
 */

type Props = {
  name: string;
  logoUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const SIZE_CLASSES: Record<NonNullable<Props["size"]>, string> = {
  sm: "h-5 w-5",
  md: "h-8 w-8",
  lg: "h-12 w-12",
};

const SIZE_PX: Record<NonNullable<Props["size"]>, number> = {
  sm: 20,
  md: 32,
  lg: 48,
};

export function StoreLogo({ name, logoUrl, size = "sm", className }: Props) {
  // `isRenderableImageUrl` filtre les URLs vides, malformées ou
  // protocol-relative (`//…`). Sans ce garde, `next/image` lance une
  // exception au render et propage "Quelque chose s'est mal passé" à
  // l'utilisateur. Sur les cartes de deals avec un store externe
  // (Carrefour, Cdiscount, etc.) dont le logo peut être un URL
  // incomplet ou indisponible en base, c'est un risque permanent.
  if (!isRenderableImageUrl(logoUrl)) return null;

  const dims = SIZE_CLASSES[size];
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
        unoptimized
      />
    </span>
  );
}
