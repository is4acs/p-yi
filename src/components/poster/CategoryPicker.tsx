import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";

import { Icon, type IconName } from "@/components/ui/Icon";
import { getMessages } from "@/lib/i18n";

export type PickerCategory = {
  slug: string;
  name: string;
  icon: string | null;
  /** Undefined when this is a child ; empty array means "parent without subs". */
  children?: PickerCategory[];
};

type Props = {
  parents: PickerCategory[];
  /**
   * When defined, the picker renders the sub-category grid for this parent
   * instead of the top-level parent grid. The parent itself is echoed at the
   * top as a breadcrumb-style chip so users don't lose context.
   */
  activeParent?: PickerCategory;
};

/**
 * Icône Péyi (stroke 2px) déduite du slug de catégorie — le champ
 * `icon` de la DB contient un emoji, banni de la refonte Soleil.
 */
function iconForSlug(slug: string): IconName {
  const s = slug.toLowerCase();
  if (/(vehicul|auto|moto|voiture|bateau|pirogue|scooter)/.test(s)) return "car";
  if (/(immo|maison|logement|location|terrain|appart)/.test(s)) return "home";
  if (/(emploi|job|recrut)/.test(s)) return "job";
  if (/(service|bricol|cours|aide)/.test(s)) return "service";
  if (/(even|sortie|loisir|billet)/.test(s)) return "event";
  if (/(alim|food|cuisine|manger|produit)/.test(s)) return "food";
  if (/(maison|meuble|deco|electromenager)/.test(s)) return "home";
  return "tag";
}

/**
 * Two-step visual category picker used on `/poster/annonce`.
 *
 *  - Top level : parents as large tiles. Parents with children expose a
 *    ">" arrow to hint that another step is coming ; childless parents
 *    jump straight to the form.
 *  - Sub level : same visual grid, with a "back" control to return to
 *    the parent list.
 *
 * Navigation is driven by URL query params (`?parent=…`, `?category=…`)
 * so the picker is fully server-rendered — no client JS needed to pick.
 */
export async function CategoryPicker({ parents, activeParent }: Props) {
  const t = await getMessages();
  if (activeParent && activeParent.children && activeParent.children.length > 0) {
    return (
      <div className="space-y-4">
        <Link
          href="/poster/annonce"
          className="inline-flex min-h-[44px] items-center gap-1 text-sm font-bold text-soleil-muted transition dark:text-soleil-muted-d"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {t.poster.allCategories}
        </Link>

        <div className="flex items-center gap-2 rounded-[14px] bg-soleil-sand px-3 py-2 text-sm dark:bg-soleil-forest">
          <Icon
            name={iconForSlug(activeParent.slug)}
            size={16}
            className="text-soleil-otext dark:text-soleil-otext-d"
          />
          <span className="font-bold text-soleil-otext dark:text-soleil-otext-d">
            {activeParent.name}
          </span>
          <span className="text-soleil-muted dark:text-soleil-muted-d">
            {t.poster.refineSub}
          </span>
        </div>

        <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {activeParent.children.map((c) => (
            <li key={c.slug}>
              <CategoryTile
                href={`/poster/annonce?category=${encodeURIComponent(c.slug)}`}
                iconName={iconForSlug(c.slug)}
                name={c.name}
              />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
      {parents.map((p) => {
        const hasChildren = !!p.children && p.children.length > 0;
        const href = hasChildren
          ? `/poster/annonce?parent=${encodeURIComponent(p.slug)}`
          : `/poster/annonce?category=${encodeURIComponent(p.slug)}`;
        return (
          <li key={p.slug}>
            <CategoryTile
              href={href}
              iconName={iconForSlug(p.slug)}
              name={p.name}
              showChevron={hasChildren}
            />
          </li>
        );
      })}
    </ul>
  );
}

function CategoryTile({
  href,
  iconName,
  name,
  showChevron = false,
}: {
  href: string;
  iconName: IconName;
  name: string;
  showChevron?: boolean;
}) {
  return (
    <Link
      href={href}
      className="group relative flex h-full flex-col items-center justify-center gap-2 rounded-2xl border-[1.5px] border-soleil-border px-3 py-5 text-center text-soleil-forest transition active:scale-[0.99] dark:border-soleil-border-d dark:text-soleil-cream"
    >
      <Icon
        name={iconName}
        size={26}
        className="text-soleil-otext dark:text-soleil-otext-d"
      />
      <span className="line-clamp-2 text-sm font-bold leading-tight">
        {name}
      </span>
      {showChevron && (
        <ChevronRight
          aria-hidden
          className="absolute right-2 top-2 h-4 w-4 text-soleil-muted dark:text-soleil-muted-d"
        />
      )}
    </Link>
  );
}
