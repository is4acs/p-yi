import Link from "next/link";
import { Shield, Sparkles } from "lucide-react";

/**
 * PosterTips — deux cards de conseils affichées à côté (desktop) ou
 * après (mobile) le formulaire `/poster`.
 *
 * Deux registres distincts :
 *   1. Spark — tactique : "comment maximiser ton deal". Donne des règles
 *      empiriques (titre précis, photos, code promo) avec un chiffre
 *      concret (3× plus de votes) pour motiver.
 *   2. Shield — communauté : "règles de publication". Redirige vers la
 *      charte officielle (/cgu). Palette verte (institutionnel) pour
 *      différencier du tip orange (coaching).
 *
 * Placement : juste sous l'aperçu live sur desktop (colonne latérale),
 * après le bouton submit sur mobile (inline dans le flux). Cf.
 * `<DealPosterLayout>` pour l'orchestration responsive.
 */

export function PosterTips() {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 rounded-[14px] bg-soleil-sand p-4 dark:bg-soleil-forest">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-soleil-orange text-soleil-forest">
          <Sparkles className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0">
          <h4 className="font-display text-sm font-extrabold text-soleil-forest dark:text-soleil-cream">
            Les deals qui cartonnent
          </h4>
          <p className="mt-1 text-xs leading-relaxed text-soleil-body dark:text-soleil-body-d sm:text-[13px]">
            Titre précis avec le prix, 3+ photos, et un code promo si possible.
            Les deals avec photo de preuve reçoivent{" "}
            <b className="font-display text-soleil-otext dark:text-soleil-otext-d">
              3× plus de votes chauds
            </b>
            .
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-[14px] bg-soleil-sand p-4 dark:bg-soleil-forest">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-soleil-forest text-soleil-cream dark:bg-soleil-cream dark:text-soleil-forest">
          <Shield className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0">
          <h4 className="font-display text-sm font-extrabold text-soleil-forest dark:text-soleil-cream">
            Règles de publication
          </h4>
          <p className="mt-1 text-xs leading-relaxed text-soleil-body dark:text-soleil-body-d sm:text-[13px]">
            Pas de liens affiliés non-déclarés, pas de deals expirés, pas de
            revente avec marge.{" "}
            <Link
              href="/cgu"
              className="font-display font-bold text-soleil-otext underline-offset-2 hover:underline dark:text-soleil-otext-d"
            >
              Lire la charte →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
