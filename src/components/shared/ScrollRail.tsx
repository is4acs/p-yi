import { cn } from "@/lib/utils";

/**
 * Rail horizontal défilable, avec un dégradé sur le bord droit.
 *
 * Sans ce dégradé, la dernière pastille visible est tranchée net au ras
 * du bord de l'écran, en plein milieu d'un mot. Ça ne se lit pas comme
 * « la liste continue à droite » mais comme un défaut d'affichage — et
 * beaucoup d'utilisateurs ne pensent alors même pas à faire défiler.
 *
 * Le dégradé part de `--background` : à poser uniquement sur un fond
 * uni de cette couleur, sinon il se verrait comme une bande claire.
 */
export function ScrollRail({
  children,
  className,
  railClassName,
  fadeClassName,
}: {
  children: React.ReactNode;
  /** Conteneur externe (positionnement, fond, bordures). */
  className?: string;
  /** Piste défilante elle-même (espacements, alignement). */
  railClassName?: string;
  /**
   * Classes du dégradé — sert à le masquer aux tailles où la piste passe
   * à la ligne au lieu de défiler (`sm:hidden` typiquement). Un dégradé
   * sur un rail qui ne défile pas n'est qu'une bande claire inexpliquée.
   */
  fadeClassName?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "scrollbar-hide flex items-center gap-2 overflow-x-auto",
          railClassName,
        )}
      >
        {children}
      </div>
      {/* `pointer-events-none` : le défilement doit traverser le dégradé,
          sinon la zone de droite devient une bande morte au doigt. */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent",
          fadeClassName,
        )}
      />
    </div>
  );
}
