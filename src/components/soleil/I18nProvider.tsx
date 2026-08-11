"use client";

import { createContext, useContext } from "react";

import type { Locale } from "@/lib/i18n/config";
import { fr, type Messages } from "@/lib/i18n/dictionaries/fr";

type I18nContextValue = { locale: Locale; messages: Messages };

const I18nContext = createContext<I18nContextValue>({
  locale: "fr",
  messages: fr,
});

/**
 * I18nProvider — le layout serveur lit le cookie de langue et injecte le
 * dictionnaire ici ; les composants client le consomment via
 * `useMessages()` / `useLocale()` sans threading de props.
 */
export function I18nProvider({
  locale,
  messages,
  children,
}: I18nContextValue & { children: React.ReactNode }) {
  return (
    <I18nContext.Provider value={{ locale, messages }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useMessages(): Messages {
  return useContext(I18nContext).messages;
}

export function useLocale(): Locale {
  return useContext(I18nContext).locale;
}
