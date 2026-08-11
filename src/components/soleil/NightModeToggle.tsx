"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useMessages } from "./I18nProvider";

/**
 * Préférence de pilotage du thème :
 *  - absente ou "auto" : le thème suit la fenêtre nocturne locale à
 *    chaque chargement (dark le soir, light le jour) ;
 *  - "manual" : l'utilisateur a touché l'interrupteur, on respecte son
 *    choix (stocké par next-themes sous la clé "theme").
 */
const MODE_KEY = "soleil-theme-mode";

/** Fenêtre nocturne locale : 18 h 45 → 06 h 15 (coucher du soleil à Cayenne). */
function isNightWindow(date: Date): boolean {
  const minutes = date.getHours() * 60 + date.getMinutes();
  return minutes >= 18 * 60 + 45 || minutes < 6 * 60 + 15;
}

/**
 * AutoNightTheme — monté une fois dans le layout : tant que le mode est
 * « auto », chaque chargement de page aligne le thème sur l'heure locale
 * (et revient donc en clair au matin).
 */
export function AutoNightTheme() {
  const { setTheme } = useTheme();

  useEffect(() => {
    try {
      if (window.localStorage.getItem(MODE_KEY) === "manual") return;
      setTheme(isNightWindow(new Date()) ? "dark" : "light");
    } catch {
      // localStorage indisponible : on laisse le thème par défaut.
    }
  }, [setTheme]);

  return null;
}

/**
 * NightModeToggle — interrupteur 44×24 branché sur next-themes. Le
 * premier toggle passe le pilotage en « manuel » ; l'auto reste actif
 * tant que l'utilisateur n'a pas touché l'interrupteur.
 */
export function NightModeToggle() {
  const t = useMessages();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  function toggle() {
    try {
      window.localStorage.setItem(MODE_KEY, "manual");
    } catch {
      // Sans stockage, le choix vaut pour la session en cours.
    }
    setTheme(isDark ? "light" : "dark");
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={t.profile.nightMode}
      onClick={toggle}
      className="relative h-6 w-11 flex-none rounded-full bg-soleil-line transition-colors dark:bg-soleil-orange"
    >
      <span
        aria-hidden
        className={cn(
          "absolute top-[3px] block h-[18px] w-[18px] rounded-full border border-soleil-border bg-soleil-input transition-all",
          isDark ? "left-[23px]" : "left-[3px]",
        )}
      />
    </button>
  );
}
