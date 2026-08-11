import Link from "next/link";

import { SunArc } from "@/components/brand/SunArc";
import { cn } from "@/lib/utils";

/**
 * Signature d'en-tête : le soleil demi-cercle suivi de `péyi`.
 *
 * Minuscules volontaires, Bricolage Grotesque 800, interlettrage
 * légèrement resserré (−0.5) : le mot doit se lire comme un logotype,
 * pas comme un titre. La couleur suit l'encre du thème (forêt le jour,
 * crème la nuit) tandis que le soleil reste orange dans les deux.
 *
 * Le P du sprite `public/icons.svg` reste disponible comme favicon et
 * icône d'application ; c'est ce wordmark qui tient l'en-tête.
 */
export function Wordmark({
  size = 26,
  className,
  href = "/",
}: {
  /** Taille du mot en pixels. Le soleil se dimensionne en proportion. */
  size?: number;
  className?: string;
  /** Passer `null` pour un rendu non cliquable (ex. dans le footer). */
  href?: string | null;
}) {
  const content = (
    <>
      <SunArc width={Math.round(size * 0.85)} />
      <span
        className="font-display font-extrabold leading-none"
        style={{ fontSize: size, letterSpacing: "-0.5px" }}
      >
        péyi
      </span>
    </>
  );

  const classes = cn("inline-flex items-end gap-1.5 text-foreground", className);

  if (href === null) {
    return <span className={classes}>{content}</span>;
  }
  return (
    <Link href={href} className={classes} aria-label="Péyi — accueil">
      {content}
    </Link>
  );
}
