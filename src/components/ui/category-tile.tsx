import Link from "next/link";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * CategoryTile — carte catégorie sur la home / page d'entrée.
 *
 * Refonte « Soleil péyi » : les quatre variantes chromatiques (rose,
 * vert citron, jaune, orange pâle) disparaissent. Elles introduisaient
 * six couleurs hors palette dans une grille posée sur crème, et c'est ce
 * qui sautait le plus aux yeux sur `/annonces`.
 *
 * Une tuile est désormais un simple filet de 1,5 px, comme les tuiles
 * compteurs du héros. Le rythme visuel de la grille est porté par les
 * icônes et les libellés, pas par des aplats colorés — la prop `variant`
 * disparaît donc avec eux.
 *
 * Usage :
 * ```tsx
 * <CategoryTile href="/annonces?category=immobilier">
 *   <HomeIcon />
 *   <span>Immobilier</span>
 *   <span>2 481</span>
 * </CategoryTile>
 * ```
 */
const TILE_STYLE = "border-[1.5px] border-input bg-transparent text-foreground";

type BaseProps = {
  className?: string;
  children: React.ReactNode;
};

type LinkProps = BaseProps & {
  href: string;
  onClick?: never;
};

type ButtonProps = BaseProps & {
  href?: never;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: never;
};

type DisabledProps = BaseProps & {
  /** Tuile inerte (catégorie encore vide) : rendue en <div>, sans
   *  affordance de clic — un lien qui affiche « Bientôt » et navigue
   *  quand même vers une page vide est un faux signal. */
  disabled: true;
  href?: never;
  onClick?: never;
};

type Props = LinkProps | ButtonProps | DisabledProps;

export function CategoryTile({
  className,
  children,
  ...rest
}: Props) {
  const isDisabled = "disabled" in rest && rest.disabled === true;
  const classes = cn(
    "group flex min-h-[86px] flex-col items-start justify-between rounded-md p-3 transition-colors duration-base",
    !isDisabled && "hover:border-peyi-orange-400",
    isDisabled && "opacity-60",
    TILE_STYLE,
    className,
  );

  if (isDisabled) {
    return (
      <div aria-disabled="true" className={classes}>
        {children}
      </div>
    );
  }

  if ("href" in rest && rest.href) {
    return (
      <Link href={rest.href} className={classes}>
        {children}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={"onClick" in rest ? rest.onClick : undefined}
      className={classes}
    >
      {children}
    </button>
  );
}
