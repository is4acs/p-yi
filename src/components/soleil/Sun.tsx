import { cn } from "@/lib/utils";

type Props = {
  /** Largeur en px du demi-cercle (hauteur = w / 2). */
  w?: number;
  className?: string;
};

/**
 * Sun — demi-cercle signature « Soleil péyi » (wordmark, item de nav
 * actif, cartes du fork Poster). Orange par défaut, surchargez la
 * couleur via className (ex. `bg-soleil-border` pour la version grise).
 */
export function Sun({ w = 20, className }: Props) {
  return (
    <span
      aria-hidden
      className={cn("inline-block rounded-t-full bg-soleil-orange", className)}
      style={{ width: w, height: w / 2 }}
    />
  );
}
