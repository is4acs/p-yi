import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Button — primitive du design system Péyi.
 *
 * Refonte « Soleil péyi » : le CTA dominant n'est plus un aplat orange
 * mais **un aplat à l'encre du thème** — forêt sur crème le jour, crème
 * sur forêt la nuit. C'est une règle du handoff : un seul aplat orange
 * plein par écran, réservé aux bannières d'accroche. Un orange en fond de
 * bouton à chaque action rendait la page criarde et faisait perdre à
 * l'orange sa valeur de signal.
 *
 * Les boutons sont des pilules (`rounded-full`), comme les chips et les
 * champs de recherche.
 *
 * Variants :
 *  - `peyi` / `default` : **CTA dominant**, aplat à l'encre du thème.
 *  - `accent` : le rare aplat orange (bannière « Pataj to bon plan ! »).
 *  - `destructive` : actions destructrices (supprimer, rejeter).
 *  - `outline` : filet 1,5 px — action secondaire.
 *  - `secondary` : surface teintée, sans bordure.
 *  - `ghost` : plat, hover légèrement coloré.
 *  - `link` : texte souligné, pas de fond.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-[colors,transform,box-shadow] duration-base active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:opacity-90",
        // Conservé sous son ancien nom : ~8 appels le désignent déjà
        // comme « le bouton principal ». Seule son apparence change.
        peyi: "bg-primary text-primary-foreground hover:opacity-90",
        // L'aplat orange, à n'utiliser qu'une fois par écran. Le texte
        // est à l'encre forêt : du blanc sur `#FF914C` ne passe pas AA.
        accent:
          "bg-peyi-orange-500 text-peyi-forest-500 hover:bg-peyi-orange-600",
        // Alias historique de l'accent vert, redirigé sur l'encre : le
        // vert Lawèt (#7ED956) ne fait plus partie de la charte UI.
        brand: "bg-primary text-primary-foreground hover:opacity-90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border-[1.5px] border-input bg-transparent hover:border-peyi-orange-400 hover:text-accent-text",
        secondary:
          "bg-surface text-secondary-foreground hover:bg-surface/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-accent-text underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 px-3.5 text-xs",
        lg: "h-11 px-7",
        // Handoff Péyi : pilule 52 px, display 800 — usage héros.
        peyi: "h-[52px] px-7 font-display text-base font-extrabold",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
