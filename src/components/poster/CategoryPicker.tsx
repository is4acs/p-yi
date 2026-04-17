import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";

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
 * Two-step visual category picker used on `/poster/annonce`.
 *
 *  - Top level : parents as large tiles (3 cols mobile / 4 cols desktop).
 *    Parents with children expose a ">" arrow to hint that another step
 *    is coming ; childless parents jump straight to the form.
 *  - Sub level : same visual grid, with a "back" control to return to
 *    the parent list.
 *
 * Navigation is driven by URL query params (`?parent=…`, `?category=…`)
 * so the picker is fully server-rendered — no client JS needed to pick.
 */
export function CategoryPicker({ parents, activeParent }: Props) {
  if (activeParent && activeParent.children && activeParent.children.length > 0) {
    return (
      <div className="space-y-4">
        <Link
          href="/poster/annonce"
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Toutes les catégories
        </Link>

        <div className="flex items-center gap-2 rounded-xl border border-peyi-orange-200 bg-peyi-orange-50 px-3 py-2 text-sm">
          {activeParent.icon && (
            <span aria-hidden className="text-lg">
              {activeParent.icon}
            </span>
          )}
          <span className="font-semibold text-peyi-orange-700">
            {activeParent.name}
          </span>
          <span className="text-peyi-orange-600/80">· précise ta sous-catégorie</span>
        </div>

        <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {activeParent.children.map((c) => (
            <li key={c.slug}>
              <CategoryTile
                href={`/poster/annonce?category=${encodeURIComponent(c.slug)}`}
                icon={c.icon}
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
              icon={p.icon}
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
  icon,
  name,
  showChevron = false,
}: {
  href: string;
  icon: string | null;
  name: string;
  showChevron?: boolean;
}) {
  return (
    <Link
      href={href}
      className="group relative flex h-full flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-5 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-peyi-orange-300 hover:shadow-md active:translate-y-0"
    >
      <span aria-hidden className="text-3xl leading-none">
        {icon ?? "📦"}
      </span>
      <span className="line-clamp-2 text-sm font-semibold leading-tight text-foreground">
        {name}
      </span>
      {showChevron && (
        <ChevronRight
          aria-hidden
          className="absolute right-2 top-2 h-4 w-4 text-muted-foreground transition group-hover:text-peyi-orange-500"
        />
      )}
    </Link>
  );
}
