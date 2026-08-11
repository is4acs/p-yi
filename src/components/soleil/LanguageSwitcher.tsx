"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n/config";
import { setLocaleAction } from "@/lib/i18n/actions";
import { useLocale } from "@/components/soleil/I18nProvider";
import { cn } from "@/lib/utils";

/**
 * LanguageSwitcher — drapeaux France / Brésil / Haïti (SVG inline, pas
 * d'emoji ni d'asset distant). La langue active porte l'anneau forêt ;
 * les autres sont légèrement estompées. Pose le cookie via server action
 * puis rafraîchit le rendu serveur. Visible dès l'accueil, sans connexion.
 */

function FlagFR({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 3 2"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
      className={className}
    >
      <rect width="1" height="2" x="0" fill="#0055A4" />
      <rect width="1" height="2" x="1" fill="#FFFFFF" />
      <rect width="1" height="2" x="2" fill="#EF4135" />
    </svg>
  );
}

function FlagBR({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 3 2"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
      className={className}
    >
      <rect width="3" height="2" fill="#009C3B" />
      <path d="M1.5 0.2 2.8 1 1.5 1.8 0.2 1Z" fill="#FFDF00" />
      <circle cx="1.5" cy="1" r="0.45" fill="#002776" />
      <path
        d="M1.08 0.93a0.9 0.9 0 0 1 0.84 0.28"
        stroke="#FFFFFF"
        strokeWidth="0.09"
        fill="none"
      />
    </svg>
  );
}

function FlagHT({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 3 2"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
      className={className}
    >
      <rect width="3" height="1" y="0" fill="#00209F" />
      <rect width="3" height="1" y="1" fill="#D21034" />
      <rect x="1.05" y="0.62" width="0.9" height="0.76" fill="#FFFFFF" />
      <rect x="1.32" y="0.86" width="0.36" height="0.28" fill="#016A16" />
    </svg>
  );
}

const FLAGS: Record<Locale, (props: { className?: string }) => JSX.Element> = {
  fr: FlagFR,
  pt: FlagBR,
  ht: FlagHT,
};

export function LanguageSwitcher({ className }: { className?: string }) {
  const current = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(locale: Locale) {
    if (locale === current || pending) return;
    startTransition(async () => {
      await setLocaleAction(locale);
      router.refresh();
    });
  }

  return (
    <div
      className={cn("flex flex-none items-center gap-1.5", className)}
      role="group"
      aria-label="Langue / Idioma / Lang"
    >
      {LOCALES.map((locale) => {
        const Flag = FLAGS[locale];
        const active = locale === current;
        return (
          <button
            key={locale}
            type="button"
            onClick={() => choose(locale)}
            disabled={pending}
            aria-pressed={active}
            aria-label={LOCALE_LABELS[locale]}
            title={LOCALE_LABELS[locale]}
            className={cn(
              "flex h-9 w-9 flex-none items-center justify-center rounded-full transition active:scale-95",
              active
                ? "ring-2 ring-soleil-forest dark:ring-soleil-cream"
                : "opacity-55 hover:opacity-90",
            )}
          >
            <span className="h-[26px] w-[26px] overflow-hidden rounded-full border border-soleil-border dark:border-soleil-border-d">
              <Flag className="h-full w-full object-cover" />
            </span>
          </button>
        );
      })}
    </div>
  );
}
