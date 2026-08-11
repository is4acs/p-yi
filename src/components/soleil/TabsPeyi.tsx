import Link from "next/link";
import { cn } from "@/lib/utils";

type Tab = "deals" | "annonces" | "activites";

const TABS: { key: Tab; label: string; href: string }[] = [
  { key: "deals", label: "Bons plans", href: "/bons-plans" },
  { key: "annonces", label: "Annonces", href: "/annonces" },
  { key: "activites", label: "Activités", href: "/activites" },
];

type Props = {
  active: Tab;
  className?: string;
};

/**
 * TabsPeyi — onglets hauts Bons plans / Annonces / Activités. L'actif
 * porte le filet orange 3px, les autres sont en muted.
 */
export function TabsPeyi({ active, className }: Props) {
  return (
    <nav
      aria-label="Sections"
      className={cn("flex gap-[18px] text-[13px] font-bold", className)}
    >
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={tab.key === active ? "page" : undefined}
          className={cn(
            "pb-1.5",
            tab.key === active
              ? "border-b-[3px] border-soleil-orange text-soleil-forest dark:text-soleil-cream"
              : "text-soleil-muted dark:text-soleil-muted-d",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
