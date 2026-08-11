"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { useMessages } from "@/components/soleil/I18nProvider";

type Item = {
  href: string;
  label: string;
  active: boolean;
  badge?: number;
};

/**
 * Nav desktop du Header global — pendant « Soleil péyi » de la MobileNav :
 * l'item actif porte l'inversion forêt/crème, Messages garde son badge
 * de non-lus. Client pour déduire l'actif du pathname.
 */
export function HeaderNav({ unreadCount = 0 }: { unreadCount?: number }) {
  const t = useMessages();
  const pathname = usePathname() ?? "/";

  const items: Item[] = [
    {
      href: "/bons-plans",
      label: t.nav.deals,
      active: pathname === "/" || pathname.startsWith("/bons-plans"),
    },
    {
      href: "/annonces",
      label: t.nav.listings,
      active: pathname.startsWith("/annonces"),
    },
    {
      href: "/activites",
      label: t.nav.activities,
      active: pathname.startsWith("/activites"),
    },
    {
      href: "/poster",
      label: t.nav.post,
      active: pathname.startsWith("/poster"),
    },
    {
      href: "/messages",
      label: t.nav.messages,
      active: pathname.startsWith("/messages"),
      badge: unreadCount,
    },
  ];

  return (
    <nav
      aria-label={t.nav.main}
      className="hidden items-center gap-1 text-sm lg:flex"
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.active ? "page" : undefined}
          className={cn(
            "relative rounded-full px-3.5 py-1.5 transition active:scale-95",
            item.active
              ? "bg-soleil-forest font-extrabold text-soleil-cream dark:bg-soleil-cream dark:text-soleil-forest"
              : "font-bold text-soleil-muted2 hover:bg-soleil-sand hover:text-soleil-forest dark:text-soleil-muted-d dark:hover:bg-soleil-forest dark:hover:text-soleil-cream",
          )}
        >
          {item.label}
          {item.badge !== undefined && item.badge > 0 && (
            <span
              aria-hidden
              className="absolute -right-1 -top-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-soleil-orange px-1 text-[10px] font-extrabold text-soleil-forest"
            >
              {item.badge > 99 ? "99+" : item.badge}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
}
