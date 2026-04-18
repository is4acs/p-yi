import Link from "next/link";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * CategoryTile — carte catégorie sur la home / page d'entrée.
 *
 * Spec handoff Peyi v1.0 :
 *  - 4 variantes chromatiques pour rythmer visuellement une grille :
 *      orange | green | rouge | jaune
 *  - Background teinté très clair (50), icône en teinte forte (700)
 *  - Padding 12px, radius md (via token tailwind), min-height 86px
 *  - Hover : translateY(-2px) + ombre légère (affordance cliquable)
 *
 * Usage :
 * ```tsx
 * <CategoryTile href="/annonces?category=immobilier" variant="orange">
 *   <HomeIcon />
 *   <span>Immobilier</span>
 *   <span>2 481</span>
 * </CategoryTile>
 * ```
 */
const VARIANT_STYLES = {
  orange: "bg-peyi-orange-50 text-peyi-orange-700",
  green: "bg-peyi-green-50 text-peyi-green-700",
  rouge: "bg-[#FBE5E8] text-peyi-rouge",
  jaune: "bg-[#FFF4C9] text-[#B68500]",
} as const;

type CategoryTileVariant = keyof typeof VARIANT_STYLES;

type BaseProps = {
  variant?: CategoryTileVariant;
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
};

type Props = LinkProps | ButtonProps;

export function CategoryTile({
  variant = "orange",
  className,
  children,
  ...rest
}: Props) {
  const classes = cn(
    "group flex min-h-[86px] flex-col items-start justify-between rounded-md p-3 transition-transform duration-base",
    "hover:-translate-y-0.5 hover:shadow-md",
    VARIANT_STYLES[variant],
    className,
  );

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
