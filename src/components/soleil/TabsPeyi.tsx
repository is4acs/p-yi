import Link from "next/link";
import { cn } from "@/lib/utils";
import { getMessages } from "@/lib/i18n";

type Tab = "deals" | "annonces" | "activites";

const TAB_LINKS: { key: Tab; href: string }[] = [
  { key: "deals", href: "/bons-plans" },
  { key: "annonces", href: "/annonces" },
  { key: "activites", href: "/activites" },
];

type Props = {
  active: Tab;
  className?: string;
};

/**
 * TabsPeyi — onglets hauts Bons plans / Annonces / Activités. L'actif
 * porte le filet orange 3px, les autres sont en muted.
 */
export async function TabsPeyi({ active, className }: Props) {
  const t = await getMessages();
  const labels: Record<Tab, string> = {
    deals: t.tabs.deals,
    annonces: t.tabs.listings,
    activites: t.tabs.activities,
  };
  return (
    <nav
      aria-label={t.tabs.sections}
      className={cn("flex gap-[18px] text-[13px] font-bold", className)}
    >
      {TAB_LINKS.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={tab.key === active ? "page" : undefined}
          className={cn(
            "flex min-h-[36px] items-end pb-1.5",
            tab.key === active
              ? "border-b-[3px] border-soleil-orange text-soleil-forest dark:text-soleil-cream"
              : "text-soleil-muted dark:text-soleil-muted-d",
          )}
        >
          {labels[tab.key]}
        </Link>
      ))}
    </nav>
  );
}
