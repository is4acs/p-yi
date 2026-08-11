"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Fournisseur de thème jour/nuit.
 *
 * `next-themes` était déjà installé et `darkMode: ["class"]` déjà
 * configuré dans Tailwind, mais aucun provider n'était monté : le thème
 * nuit n'avait donc jamais pu s'activer. C'est ce chaînon qui manquait.
 *
 * `defaultTheme="system"` : on suit la préférence de l'appareil tant que
 * l'utilisateur n'a rien choisi. La bascule du profil écrit ensuite son
 * choix dans le `localStorage`, et il prime.
 *
 * `disableTransitionOnChange` : sans ça, les transitions de couleur
 * déclarées un peu partout se lancent toutes en même temps au changement
 * de thème et la page fond pendant 200 ms au lieu de basculer net.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
