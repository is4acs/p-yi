"use client";

import { SlidersHorizontal, Sparkles, X } from "lucide-react";
import type { AccessMode, ActivityCategory, Difficulty } from "@prisma/client";

import {
  ACCESS_MODE_VALUES,
  ACTIVITY_CATEGORIES,
  ACTIVITY_CATEGORY_VALUES,
  countActiveFilters,
  DIFFICULTY_VALUES,
  DURATION_FILTERS,
  EMPTY_FILTERS,
  PRICE_FILTERS,
  type ActivityFilters,
} from "@/lib/activities/filters";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { useMessages } from "@/components/soleil/I18nProvider";
import { tFormat } from "@/lib/i18n/tformat";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Barre de filtres de la carte des activités. Une seule ligne scrollable :
 * bouton « Filtres » (dialog avec commune/accès/prix/durée/difficulté),
 * toggle « Praticable en ce moment », chips catégories multi-sélection,
 * « Tout effacer ». L'état vit dans l'URL (géré par l'Explorer) — la même
 * barre sert le split view desktop et le bottom sheet mobile.
 */

type Props = {
  filters: ActivityFilters;
  onChange: (next: ActivityFilters) => void;
  /** Nombre de résultats après filtres (Guyane entière). */
  resultCount: number;
  /** Communes présentes dans les données (slug + nom), triées. */
  cities: { slug: string; name: string }[];
  className?: string;
};

export function ActivitiesFilterBar({
  filters,
  onChange,
  resultCount,
  cities,
  className,
}: Props) {
  const t = useMessages();
  const activeCount = countActiveFilters(filters);

  const toggleCategory = (category: ActivityCategory) => {
    const has = filters.categories.includes(category);
    onChange({
      ...filters,
      categories: has
        ? filters.categories.filter((value) => value !== category)
        : [...filters.categories, category],
    });
  };

  const toggleAccessMode = (mode: AccessMode) => {
    const has = filters.accessModes.includes(mode);
    onChange({
      ...filters,
      accessModes: has
        ? filters.accessModes.filter((value) => value !== mode)
        : [...filters.accessModes, mode],
    });
  };

  const setDifficulty = (difficulty: Difficulty) => {
    onChange({
      ...filters,
      difficulty: filters.difficulty === difficulty ? null : difficulty,
    });
  };

  const clearAll = () => onChange(EMPTY_FILTERS);

  return (
    <div
      className={cn(
        "flex items-center gap-2 overflow-x-auto px-3 py-2 [scrollbar-width:none]",
        className,
      )}
    >
      <Dialog>
        <DialogTrigger asChild>
          <Chip className="shrink-0">
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
            {t.act.filters}
            {activeCount > 0 && (
              <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-soleil-orange px-1 text-[10px] font-extrabold text-soleil-forest">
                {activeCount}
              </span>
            )}
          </Chip>
        </DialogTrigger>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.act.filterTitle}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            <section>
              <h3 className="mb-2 text-sm font-semibold">{t.act.commune}</h3>
              <select
                value={filters.citySlug ?? ""}
                onChange={(event) =>
                  onChange({
                    ...filters,
                    citySlug: event.target.value || null,
                  })
                }
                className="h-10 w-full rounded-sm border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">{t.act.allCommunes}</option>
                {cities.map((city) => (
                  <option key={city.slug} value={city.slug}>
                    {city.name}
                  </option>
                ))}
              </select>
            </section>

            <section>
              <h3 className="mb-2 text-sm font-semibold">{t.act.accessMode}</h3>
              <div className="flex flex-wrap gap-1.5">
                {ACCESS_MODE_VALUES.map((mode) => (
                  <Chip
                    key={mode}
                    active={filters.accessModes.includes(mode)}
                    onClick={() => toggleAccessMode(mode)}
                  >
                    {t.act.access[mode]}
                  </Chip>
                ))}
              </div>
            </section>

            <section>
              <h3 className="mb-2 text-sm font-semibold">{t.common.price}</h3>
              <div className="flex flex-wrap gap-1.5">
                {PRICE_FILTERS.map((option) => (
                  <Chip
                    key={option.slug}
                    active={filters.price === option.slug}
                    onClick={() =>
                      onChange({
                        ...filters,
                        price:
                          filters.price === option.slug ? null : option.slug,
                      })
                    }
                  >
                    {t.act.priceFilters[option.slug]}
                  </Chip>
                ))}
              </div>
            </section>

            <section>
              <h3 className="mb-2 text-sm font-semibold">{t.act.duration}</h3>
              <div className="flex flex-wrap gap-1.5">
                {DURATION_FILTERS.map((option) => (
                  <Chip
                    key={option.slug}
                    active={filters.duration === option.slug}
                    onClick={() =>
                      onChange({
                        ...filters,
                        duration:
                          filters.duration === option.slug
                            ? null
                            : option.slug,
                      })
                    }
                  >
                    {t.act.durationFilters[option.slug]}
                  </Chip>
                ))}
              </div>
            </section>

            <section>
              <h3 className="mb-2 text-sm font-semibold">{t.act.difficulty}</h3>
              <div className="flex flex-wrap gap-1.5">
                {DIFFICULTY_VALUES.map((value) => (
                  <Chip
                    key={value}
                    active={filters.difficulty === value}
                    onClick={() => setDifficulty(value)}
                  >
                    {t.act.difficulties[value]}
                  </Chip>
                ))}
              </div>
            </section>
          </div>

          <DialogFooter className="mt-2 flex-row items-center justify-between gap-2 sm:justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              disabled={activeCount === 0}
            >
              <X aria-hidden /> {t.act.clearAll}
            </Button>
            <DialogClose asChild>
              <Button variant="peyi" size="sm">
                {tFormat(t.act.seeResults, { n: resultCount })}
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Chip
        active={filters.inSeasonNow}
        onClick={() =>
          onChange({ ...filters, inSeasonNow: !filters.inSeasonNow })
        }
        className="shrink-0"
        title={t.act.inSeasonHint}
      >
        <Sparkles className="h-3.5 w-3.5" aria-hidden />
        {t.act.inSeason}
      </Chip>

      {ACTIVITY_CATEGORY_VALUES.map((category) => {
        const meta = ACTIVITY_CATEGORIES[category];
        return (
          <Chip
            key={category}
            active={filters.categories.includes(category)}
            onClick={() => toggleCategory(category)}
            className="shrink-0"
          >
            <span
              aria-hidden
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: meta.color }}
            />
            {t.act.categories[category]}
          </Chip>
        );
      })}

      {activeCount > 0 && (
        <button
          type="button"
          onClick={clearAll}
          className="shrink-0 whitespace-nowrap text-xs font-bold text-soleil-otext hover:underline dark:text-soleil-otext-d"
        >
          {t.act.clearAll}
        </button>
      )}
    </div>
  );
}
