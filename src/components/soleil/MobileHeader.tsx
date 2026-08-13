import Link from "next/link";

import { Icon } from "@/components/ui/Icon";
import { Sun } from "@/components/soleil/Sun";
import type { Messages } from "@/lib/i18n";

/**
 * Header wordmark mobile des pages liste (le Header global prend le
 * relais en lg) — auparavant dupliqué au pixel près sur la home,
 * /bons-plans et /annonces.
 *
 * Deux variantes :
 *  - `home` : wordmark légèrement plus grand, lien connexion en pilule
 *    texte (l'utilisateur arrive ici en premier) ;
 *  - `catalogue` : wordmark compact, connexion en bouton rond icône.
 *
 * `right` : élément(s) affichés à droite AVANT l'avatar/connexion —
 * LanguageSwitcher sur la home, pilule ville sur /bons-plans.
 */
export function MobileHeader({
  user,
  t,
  right,
  variant = "catalogue",
}: {
  user: { username: string } | null;
  t: Messages;
  right?: React.ReactNode;
  variant?: "home" | "catalogue";
}) {
  const isHome = variant === "home";
  return (
    <div
      className={
        (isHome ? "flex items-center" : "flex items-end") +
        " justify-between pt-4 lg:hidden"
      }
    >
      <Link href="/" className="flex items-end gap-2" aria-label={t.nav.home}>
        <Sun w={isHome ? 22 : 20} />
        <span
          className={
            "font-display font-extrabold leading-[0.9] tracking-[-0.5px] " +
            (isHome ? "text-[25px]" : "text-[23px]")
          }
        >
          péyi
        </span>
      </Link>
      <div className="flex items-center gap-2">
        {right}
        {user ? (
          <Link
            href="/profil"
            aria-label={t.home.myProfile}
            className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-soleil-forest text-[11.5px] font-extrabold text-soleil-cream dark:bg-soleil-cream dark:text-soleil-forest"
          >
            {user.username.trim().slice(0, 2).toUpperCase()}
          </Link>
        ) : isHome ? (
          <Link
            href="/connexion"
            className="rounded-full bg-soleil-forest px-3 py-1.5 text-xs font-extrabold text-soleil-cream dark:bg-soleil-cream dark:text-soleil-forest"
          >
            {t.home.connection}
          </Link>
        ) : (
          <Link
            href="/connexion"
            aria-label={t.home.myProfile}
            className="flex h-[34px] w-[34px] items-center justify-center rounded-full border-[1.5px] border-soleil-forest dark:border-soleil-cream"
          >
            <Icon name="user" size={15} />
          </Link>
        )}
      </div>
    </div>
  );
}
