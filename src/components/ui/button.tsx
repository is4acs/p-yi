import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Button — primitive du design system Peyi.
 *
 * Variants :
 *  - `default` : bouton shadcn neutre (bg-primary), historique. Conservé
 *    pour les 10+ usages existants qui ne veulent pas l'ombre de marque.
 *  - `peyi` : **CTA principal Peyi** (orange + shadow-brand + translateY
 *    au hover). À utiliser pour le bouton d'action dominant d'une page
 *    ("Poster une annonce", "Envoyer", "Se connecter"…).
 *  - `brand` : vert Lawèt — accent de marque, second CTA.
 *  - `destructive` : actions destructrices (supprimer, rejeter).
 *  - `outline` : bordure discrète, usage secondaire.
 *  - `secondary` : fond secondaire shadcn (gris-vert atténué).
 *  - `ghost` : plat, hover légèrement coloré.
 *  - `link` : texte souligné, pas de fond.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[colors,transform,box-shadow] duration-base active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        // Peyi primary — spec handoff : orange + shadow-brand + liftoff au
        // hover (-1px). Usage : CTA dominant de la page.
        peyi:
          "bg-peyi-orange-500 text-white shadow-brand hover:bg-peyi-orange-600 hover:-translate-y-px",
        brand:
          "bg-peyi-green-500 text-white hover:bg-peyi-green-600 hover:-translate-y-px",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        // Handoff Peyi : pill arrondi 52px, font-display 700 — usage hero.
        peyi: "h-[52px] rounded-full px-7 font-display text-base font-bold",
        icon: "h-9 w-9",
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
