"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";
import { useMessages } from "./I18nProvider";
import { Sun } from "./Sun";

type ActiveTab = "deals" | "annonces" | "activites" | "messages";

type Props = {
  /** Force l'onglet actif ; sinon il est déduit du pathname. */
  active?: ActiveTab;
  unreadCount?: number;
};

function deriveActive(pathname: string): ActiveTab | null {
  if (pathname === "/" || pathname.startsWith("/bons-plans")) return "deals";
  if (pathname.startsWith("/annonces")) return "annonces";
  if (pathname.startsWith("/activites")) return "activites";
  if (pathname.startsWith("/messages")) return "messages";
  return null;
}

/**
 * MobileNav — nav basse « Soleil péyi » : l'item actif porte le
 * demi-cercle soleil, le bouton central Poster passe en orange quand on
 * est sur /poster. Visible jusqu'à lg (desktop = nav du header).
 */
export function MobileNav({ active, unreadCount = 0 }: Props) {
  const t = useMessages();
  const pathname = usePathname() ?? "/";
  const current = active ?? deriveActive(pathname);
  const posterActive = pathname.startsWith("/poster");

  return (
    <nav
      aria-label={t.nav.main}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-soleil-line bg-soleil-cream pb-[env(safe-area-inset-bottom)] dark:border-soleil-line-d dark:bg-soleil-night lg:hidden"
    >
      <div className="flex items-end justify-around px-2 pb-3 pt-2">
        <NavItem
          href="/bons-plans"
          label={t.nav.deals}
          active={current === "deals"}
        />
        <NavItem
          href="/annonces"
          label={t.nav.listings}
          active={current === "annonces"}
        />
        <Link
          href="/poster"
          aria-label={t.nav.post}
          aria-current={posterActive ? "page" : undefined}
          className={cn(
            "-mt-6 flex h-[46px] w-[46px] flex-none items-center justify-center rounded-full transition active:scale-95",
            posterActive
              ? "bg-soleil-orange text-soleil-forest"
              : "bg-soleil-forest text-soleil-orange dark:bg-soleil-cream dark:text-soleil-forest",
          )}
        >
          <Icon name="plus" size={19} />
        </Link>
        <NavItem
          href="/activites"
          label={t.nav.activities}
          active={current === "activites"}
        />
        <NavItem
          href="/messages"
          label={t.nav.messages}
          active={current === "messages"}
          badge={unreadCount}
        />
      </div>
    </nav>
  );
}

function NavItem({
  href,
  label,
  active,
  badge = 0,
}: {
  href: string;
  label: string;
  active: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex min-h-[44px] min-w-[56px] flex-col items-center justify-end gap-1 px-1 pb-0.5 text-[11px] transition active:scale-95",
        active
          ? "font-bold text-soleil-forest dark:text-soleil-cream"
          : "font-semibold text-soleil-muted dark:text-soleil-muted-d",
      )}
    >
      {active ? <Sun w={12} /> : <span aria-hidden className="h-1.5" />}
      <span>{label}</span>
      {badge > 0 && (
        <span
          aria-label={`${badge} non lu${badge > 1 ? "s" : ""}`}
          className="absolute -top-0.5 right-0 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-soleil-orange px-1 text-[9px] font-extrabold text-soleil-forest"
        >
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}
