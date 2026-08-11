import { cn } from "@/lib/utils";

/**
 * Soleil demi-cercle — la signature graphique de la refonte.
 *
 * Un demi-disque orange posé sur sa base plate : deux fois plus large
 * que haut, arrondi seulement en haut. Il revient à quatre endroits, à
 * quatre tailles :
 *
 *  | Usage                        | largeur × hauteur |
 *  | ---------------------------- | ----------------- |
 *  | wordmark `péyi`              | 22 × 11           |
 *  | onglet actif de la nav basse | 12 × 6            |
 *  | footer                       | 14 × 7            |
 *  | icône du fork « Poster »     | 18 × 9            |
 *
 * L'orange `#FF914C` ne bascule pas entre jour et nuit — c'est le point
 * fixe de l'identité, celui auquel on reconnaît la marque quel que soit
 * le thème. D'où la couleur en dur plutôt qu'un token de thème.
 */
export function SunArc({
  width = 22,
  className,
}: {
  /** Largeur en pixels. La hauteur en découle : toujours la moitié. */
  width?: number;
  className?: string;
}) {
  const height = width / 2;
  return (
    <span
      aria-hidden
      className={cn("block shrink-0 bg-peyi-orange-500", className)}
      style={{
        width,
        height,
        borderRadius: `${height}px ${height}px 0 0`,
      }}
    />
  );
}
