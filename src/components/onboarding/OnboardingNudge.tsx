"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, Sparkles, X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * OnboardingNudge — bannière compacte affichée en haut du feed
 * `/bons-plans` pour les utilisateurs dont le profil ou l'activité
 * est encore incomplet(e). Rend 2–4 étapes à cocher avec lien direct
 * vers la bonne page.
 *
 * Déclenché uniquement si au moins une étape est manquante. Se
 * masque automatiquement quand tout est complété OU si l'utilisateur
 * a explicitement dismiss (`localStorage peyi_onboarding_dismissed`).
 *
 * Pourquoi côté client et non server ?
 *   - Dismiss persistant côté browser (localStorage), pas besoin de
 *     round-trip DB pour une UX feature soft
 *   - Empty-state hints sont computés serveur puis passés en props,
 *     donc la logique métier reste server-authoritative
 */

type Step = {
  key: string;
  label: string;
  href: string;
  done: boolean;
};

type Props = {
  steps: Step[];
  /** Clé localStorage pour dismiss persistant. Si omise, pas de dismiss. */
  storageKey?: string;
};

const DISMISS_STORAGE_KEY = "peyi_onboarding_dismissed_v1";

export function OnboardingNudge({
  steps,
  storageKey = DISMISS_STORAGE_KEY,
}: Props) {
  const [dismissed, setDismissed] = useState(true);

  // Lire le flag de dismiss au mount uniquement — sinon on flashes
  // le banner à chaque remontage même quand l'user l'avait fermé.
  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(storageKey) === "1");
    } catch {
      // localStorage indisponible (mode privé ancien Safari) — on
      // laisse le banner visible, c'est le cas non-critique.
      setDismissed(false);
    }
  }, [storageKey]);

  const pending = steps.filter((s) => !s.done);
  if (pending.length === 0) return null;
  if (dismissed) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      // idem — on ignore silencieusement
    }
    setDismissed(true);
  };

  return (
    <section
      aria-label="Bien démarrer sur Péyi"
      className="mt-4 rounded-[14px] border-[1.5px] border-soleil-border bg-soleil-input p-4 dark:border-soleil-border-d dark:bg-soleil-forest"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-soleil-otext dark:text-soleil-otext-d" aria-hidden />
          <h2 className="font-display text-sm font-extrabold text-soleil-forest dark:text-soleil-cream">
            Bien démarrer sur Péyi
          </h2>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Masquer ce guide"
          className="-m-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-soleil-muted2 dark:text-soleil-muted-d"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <ul className="mt-3 flex flex-col gap-2 text-sm">
        {steps.map((step) => (
          <li key={step.key} className="flex items-center gap-2">
            {step.done ? (
              <CheckCircle2
                className="h-4 w-4 shrink-0 text-soleil-otext dark:text-soleil-otext-d"
                aria-hidden
              />
            ) : (
              <Circle
                className="h-4 w-4 shrink-0 text-soleil-muted2 dark:text-soleil-muted-d"
                aria-hidden
              />
            )}
            {step.done ? (
              <span className="text-soleil-muted2 line-through dark:text-soleil-muted-d">
                {step.label}
              </span>
            ) : (
              <Link
                href={step.href}
                className={cn(
                  "font-bold text-soleil-body underline-offset-2 hover:underline dark:text-soleil-body-d",
                )}
              >
                {step.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
