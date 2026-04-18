import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Input — champ texte primitif du design system Peyi.
 *
 * Focus — **signature orange Péyi** (handoff `components.md`) :
 *   border `--peyi-orange` + ring 4px `--peyi-orange-100`
 *
 * On s'éloigne du `ring-1 ring-ring` générique shadcn pour deux
 * raisons :
 *  1. L'affordance de focus doit être Péyi-branded, pas neutre —
 *     c'est une interaction à très haute fréquence (search, formulaire
 *     de publication, login), elle porte la personnalité du système.
 *  2. Ring 4px > 1px = accessibility AA renforcée : le halo orange
 *     pâle (-100) reste visible même pour les utilisateurs avec une
 *     basse acuité visuelle.
 *
 * Pour les cas où on veut désactiver le focus branded (ex : input
 * intégré dans une SearchBar composée qui gère son propre focus au
 * niveau parent), passer `className="focus-visible:ring-0 focus-visible:border-input"`.
 */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-[color,border-color,box-shadow] duration-base file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-peyi-orange-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-peyi-orange-100 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
