"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

/** Fenêtre nocturne locale : 18 h 45 → 06 h 15 (coucher du soleil à Cayenne). */
function isNightWindow(date: Date): boolean {
  const minutes = date.getHours() * 60 + date.getMinutes();
  return minutes >= 18 * 60 + 45 || minutes < 6 * 60 + 15;
}

/**
 * NightModeToggle — interrupteur 44×24 branché sur next-themes. Tant
 * qu'aucune préférence n'est enregistrée, le mode nuit s'active
 * automatiquement dans la fenêtre nocturne locale.
 */
export function NightModeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      if (!window.localStorage.getItem("theme") && isNightWindow(new Date())) {
        setTheme("dark");
      }
    } catch {
      // localStorage indisponible (navigation privée stricte) : tant pis
      // pour l'auto — le toggle manuel reste fonctionnel.
    }
  }, [setTheme]);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Mode nuit"
      onClick={() => setTheme(isDark ? "light" : "dark")}
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
