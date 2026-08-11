"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  LOCALES,
  LOCALE_LABELS,
  LOCALE_SHORT,
  type Locale,
} from "@/lib/i18n/config";
import { setLocaleAction } from "@/lib/i18n/actions";
import { useLocale } from "@/components/soleil/I18nProvider";
import { cn } from "@/lib/utils";

/**
 * LanguageSwitcher — pilules FR / PT / KR (rangée Langue du profil).
 * Pose le cookie via server action puis rafraîchit le rendu serveur.
 */
export function LanguageSwitcher() {
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
    <div className="flex flex-none gap-1.5" role="group" aria-label="Langue">
      {LOCALES.map((locale) => (
        <button
          key={locale}
          type="button"
          onClick={() => choose(locale)}
          disabled={pending}
          aria-pressed={locale === current}
          title={LOCALE_LABELS[locale]}
          className={cn(
            "flex h-9 min-w-[38px] items-center justify-center rounded-full px-2 text-[11px] font-extrabold transition active:scale-95",
            locale === current
              ? "bg-soleil-forest text-soleil-cream dark:bg-soleil-cream dark:text-soleil-forest"
              : "border-[1.5px] border-soleil-border text-soleil-muted2 dark:border-soleil-border-d dark:text-soleil-muted-d",
          )}
        >
          {LOCALE_SHORT[locale]}
        </button>
      ))}
    </div>
  );
}
