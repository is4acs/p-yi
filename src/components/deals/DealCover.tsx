import Image from "next/image";

import { cn } from "@/lib/utils";
import { DealImagePlaceholder } from "./DealImagePlaceholder";

type Props = {
  /** URL d'une vraie photo uploadée par l'auteur (prioritaire). */
  coverImageUrl?: string | null;
  /** Logo du magasin — fallback visuel quand le deal n'a pas de photo. */
  storeLogoUrl?: string | null;
  /** Emoji de catégorie, rendu si les deux précédents sont vides. */
  emoji?: string | null;
  /** Libellé accessible + initiale du placeholder ultime. */
  label?: string | null;
  className?: string;
};

/**
 * Vignette d'un bon plan. Trois niveaux de fallback, dans l'ordre :
 *   1. `coverImageUrl` (photo de l'auteur) — `object-cover`
 *   2. `storeLogoUrl` (logo d'enseigne) — `object-contain` sur fond
 *       blanc pour que les logos à bord plein ne débordent pas
 *   3. gradient + emoji de catégorie (comportement historique)
 *
 * Le niveau 2 est un choix produit : sur une app Guyane où la majorité
 * des deals n'ont pas de photo propre, afficher le logo de l'enseigne
 * aide l'utilisateur à scanner la liste ("un deal Pli Bel Price, un
 * deal Mobilia…") au lieu de voir le même emoji "🛒" partout.
 */
export function DealCover({
  coverImageUrl,
  storeLogoUrl,
  emoji,
  label,
  className,
}: Props) {
  if (coverImageUrl) {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-lg bg-neutral-100",
          className,
        )}
      >
        <Image
          src={coverImageUrl}
          alt={label ?? ""}
          fill
          sizes="(max-width: 640px) 80px, 140px"
          className="object-cover"
        />
      </div>
    );
  }

  if (storeLogoUrl) {
    return (
      <div
        className={cn(
          "flex items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-border p-2",
          className,
        )}
        role="img"
        aria-label={label ? `Logo ${label}` : "Logo du magasin"}
      >
        <Image
          src={storeLogoUrl}
          alt=""
          width={240}
          height={240}
          className="max-h-full max-w-full object-contain"
        />
      </div>
    );
  }

  return <DealImagePlaceholder emoji={emoji} label={label} className={className} />;
}
