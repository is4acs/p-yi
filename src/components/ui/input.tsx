import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Input — champ texte primitif, aligné sur le langage « Soleil péyi »
 * (mêmes surfaces que `components/soleil/field.ts` : fond crème input,
 * bordure 1.5px, focus = bordure forêt — pas de ring parasite). Utilisé
 * par les formulaires de publication, le profil, les alertes et
 * l'admin : un seul endroit à toucher pour tout le système.
 */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-[10px] border-[1.5px] border-soleil-border bg-soleil-input px-3 py-1 text-base font-semibold text-soleil-forest transition-[color,border-color,box-shadow] duration-base file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:font-medium placeholder:text-soleil-muted focus-visible:border-soleil-forest focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-soleil-border-d dark:bg-soleil-forest dark:text-soleil-cream dark:placeholder:text-soleil-muted-d dark:focus-visible:border-soleil-cream md:text-sm",
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
