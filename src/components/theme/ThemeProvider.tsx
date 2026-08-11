"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Fournisseur de thème jour/nuit.
 *
 * `next-themes` était déjà installé et `darkMode: ["class"]` déjà
 * configuré dans Tailwind, mais aucun provider n'était monté : le thème
 * nuit n'avait donc jamais pu s'activer. C'est ce chaînon qui manquait.
 *
 * **Le thème nuit n'est pas encore proposé automatiquement.** Tant que
 * tous les écrans n'ont pas basculé sur les tokens de la refonte, il
 * reste des fonds et des textes écrits en dur qui ne suivent pas le
 * thème : un visiteur dont le système est en sombre verrait des zones
 * illisibles. On force donc le jour (`enableSystem={false}`), le temps
 * de reprendre les écrans un par un.
 *
 * Le mécanisme, lui, est bien en place : poser la classe `dark` sur
 * `<html>` bascule déjà tout le socle de couleurs. Il restera à repasser
 * en `defaultTheme="system"` + `enableSystem` quand la bascule du profil
 * arrivera, à la fin de la refonte.
 *
 * `disableTransitionOnChange` : sans ça, les transitions de couleur
 * déclarées un peu partout se lancent toutes en même temps au changement
 * de thème et la page fond pendant 200 ms au lieu de basculer net.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
