"use client";

import { SlidersHorizontal, Sparkles, X } from "lucide-react";
import type { AccessMode, ActivityCategory, Difficulty } from "@prisma/client";

import {
  ACCESS_MODE_VALUES,
  ACCESS_MODES,
  ACTIVITY_CATEGORIES,
  ACTIVITY_CATEGORY_VALUES,
  countActiveFilters,
  DIFFICULTIES,
  DIFFICULTY_VALUES,
  DURATION_FILTERS,
  EMPTY_FILTERS,
  PRICE_FILTERS,
  type ActivityFilters,
} from "@/lib/activities/filters";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollRail } from "@/components/shared/ScrollRail";
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
    <ScrollRail
      className={cn("bg-background", className)}
      railClassName="px-3 py-2"
    >
      <Dialog>
        <DialogTrigger asChild>
          <Chip className="shrink-0">
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
            Filtres
            {activeCount > 0 && (
              <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-peyi-orange-500 px-1 font-mono text-[10px] font-bold text-white">
                {activeCount}
              </span>
            )}
          </Chip>
        </DialogTrigger>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Filtrer les activités</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            <section>
              <h3 className="mb-2 text-sm font-semibold">Commune</h3>
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
                <option value="">Toutes les communes</option>
                {cities.map((city) => (
                  <option key={city.slug} value={city.slug}>
                    {city.name}
                  </option>
                ))}
              </select>
            </section>

            <section>
              <h3 className="mb-2 text-sm font-semibold">Mode d&apos;accès</h3>
              <div className="flex flex-wrap gap-1.5">
                {ACCESS_MODE_VALUES.map((mode) => (
                  <Chip
                    key={mode}
                    active={filters.accessModes.includes(mode)}
                    onClick={() => toggleAccessMode(mode)}
                  >
                    <span aria-hidden>{ACCESS_MODES[mode].emoji}</span>
                    {ACCESS_MODES[mode].label}
                  </Chip>
                ))}
              </div>
            </section>

            <section>
              <h3 className="mb-2 text-sm font-semibold">Prix</h3>
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
                    {option.label}
                  </Chip>
                ))}
              </div>
            </section>

            <section>
              <h3 className="mb-2 text-sm font-semibold">Durée</h3>
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
                    {option.label}
                  </Chip>
                ))}
              </div>
            </section>

            <section>
              <h3 className="mb-2 text-sm font-semibold">Difficulté</h3>
              <div className="flex flex-wrap gap-1.5">
                {DIFFICULTY_VALUES.map((value) => (
                  <Chip
                    key={value}
                    active={filters.difficulty === value}
                    onClick={() => setDifficulty(value)}
                  >
                    {DIFFICULTIES[value].label}
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
              <X aria-hidden /> Tout effacer
            </Button>
            <DialogClose asChild>
              <Button variant="peyi" size="sm">
                Voir {resultCount} résultat{resultCount > 1 ? "s" : ""}
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
        title="Ne montrer que les activités praticables à la saison actuelle"
      >
        <Sparkles className="h-3.5 w-3.5" aria-hidden />
        Praticable en ce moment
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
            <span aria-hidden>{meta.emoji}</span>
            {meta.label}
          </Chip>
        );
      })}

      {activeCount > 0 && (
        <button
          type="button"
          onClick={clearAll}
          className="shrink-0 whitespace-nowrap text-xs font-medium text-peyi-orange-700 hover:text-peyi-orange-800"
        >
          Tout effacer
        </button>
      )}
    </ScrollRail>
  );
}
