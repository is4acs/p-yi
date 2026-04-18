import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Badge — pastille d'état/catégorie.
 *
 * Variants shadcn historiques (`default`, `secondary`, `destructive`,
 * `outline`) conservés pour la rétrocompatibilité.
 *
 * Variants Peyi v1.0 (handoff avril 2026) — chaque badge éditorial a une
 * sémantique précise. Ne les inter-changez pas au hasard :
 *  - `promo` : réduction / bon prix (orange Solèy)
 *  - `new` : nouveauté / fraîchement publié (vert Lawèt)
 *  - `local` : "100% local", fait en Guyane (rouge drapeau)
 *  - `bonplan` : deal / affaire (jaune drapeau, lisible sur fond foncé)
 *
 * Typo : display 800, 9-10px, uppercase, letter-spacing serré.
 */
const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground",
        // Peyi v1.0 — accents éditoriaux
        promo:
          "border-transparent bg-peyi-orange-500 text-white font-display font-extrabold uppercase tracking-[0.08em] px-2 py-[3px] text-[10px] rounded-full",
        new: "border-transparent bg-peyi-green-500 text-white font-display font-extrabold uppercase tracking-[0.08em] px-2 py-[3px] text-[10px] rounded-full",
        local:
          "border-transparent bg-peyi-rouge text-white font-display font-extrabold uppercase tracking-[0.08em] px-2 py-[3px] text-[10px] rounded-full",
        bonplan:
          "border-transparent bg-peyi-jaune text-ink-900 font-display font-extrabold uppercase tracking-[0.08em] px-2 py-[3px] text-[10px] rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
