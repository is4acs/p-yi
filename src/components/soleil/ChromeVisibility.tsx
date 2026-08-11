"use client";

import { usePathname } from "next/navigation";

/**
 * Routes refondues « Soleil péyi » : leurs écrans mobiles embarquent
 * leur propre en-tête (wordmark ou BackHeader), donc le Header global
 * n'apparaît qu'à partir de lg sur ces routes.
 */
const SOLEIL_PREFIXES = [
  "/bons-plans",
  "/annonces",
  "/poster",
  "/messages",
  "/profil",
];

export function ChromeVisibility({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";
  const isSoleil = SOLEIL_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (!isSoleil) return <>{children}</>;
  return <div className="hidden lg:block">{children}</div>;
}
