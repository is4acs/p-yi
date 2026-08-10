"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  GripVertical,
  ImagePlus,
  Trash2,
} from "lucide-react";
import type {
  AccessMode,
  ActivityCategory,
  Difficulty,
  Season,
} from "@prisma/client";

import {
  ACCESS_MODE_VALUES,
  ACCESS_MODES,
  ACTIVITY_CATEGORIES,
  ACTIVITY_CATEGORY_VALUES,
  DIFFICULTIES,
  DIFFICULTY_VALUES,
  SEASONS,
} from "@/lib/activities/labels";
import {
  DAY_KEYS,
  DAY_LABELS,
  parseOpeningHours,
  type DayKey,
} from "@/lib/activities/opening-hours";
import { uploadFilesDirect } from "@/lib/client/upload";
import { SubmitButton } from "@/components/ui/submit-button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// MapLibre casse au SSR → mini-carte chargée côté client uniquement.
const ActivityPositionPicker = dynamic(
  () => import("@/components/admin/ActivityPositionPicker"),
  { ssr: false, loading: () => <Skeleton className="h-80 w-full rounded-md" /> },
);

/**
 * Formulaire admin création/édition d'activité. Convention repo : Server
 * Action (`adminSaveActivityAction`) + zod côté serveur ; ici uniquement
 * l'état client nécessaire (images uploadées + réordonnables, position
 * sur carte, toggle gratuit).
 */

export type ActivityFormInitial = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  category: ActivityCategory;
  tags: string[];
  latitude: number;
  longitude: number;
  citySlug: string;
  address: string | null;
  startPoint: string | null;
  accessModes: AccessMode[];
  durationMinutes: number | null;
  difficulty: Difficulty | null;
  seasons: Season[];
  accessNote: string | null;
  priceMinCents: number | null;
  priceMaxCents: number | null;
  isFree: boolean;
  bookingRequired: boolean;
  bookingUrl: string | null;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  instagram: string | null;
  isFeatured: boolean;
  openingHours: unknown;
  images: { url: string; altText: string; credit: string | null }[];
};

type FormImage = { url: string; altText: string; credit?: string | null };

type Props = {
  cities: { slug: string; name: string }[];
  activity?: ActivityFormInitial;
  action: (formData: FormData) => Promise<void>;
};

const inputClass =
  "h-9 w-full rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peyi-orange-500";
const textareaClass =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-peyi-orange-500";
const labelClass = "mb-1 block text-sm font-medium";
const sectionClass = "rounded-lg border border-border bg-card p-4 space-y-4";

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function ActivityForm({ cities, activity, action }: Props) {
  const [images, setImages] = useState<FormImage[]>(activity?.images ?? []);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [position, setPosition] = useState<{
    latitude: number | null;
    longitude: number | null;
  }>({
    latitude: activity?.latitude ?? null,
    longitude: activity?.longitude ?? null,
  });
  const [isFree, setIsFree] = useState(activity?.isFree ?? false);
  const dragIndex = useRef<number | null>(null);

  const hours = parseOpeningHours(activity?.openingHours) ?? {};
  const dayDefault = (day: DayKey) =>
    (hours[day] ?? []).map(([start, end]) => `${start}-${end}`).join(", ");

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setUploadError(null);
    setUploading(true);
    try {
      const urls = await uploadFilesDirect("activity", [...fileList]);
      setImages((current) =>
        [
          ...current,
          ...urls.map((url) => ({ url, altText: "", credit: null })),
        ].slice(0, 12),
      );
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Échec de l'upload.",
      );
    } finally {
      setUploading(false);
    }
  }

  function moveImage(from: number, to: number) {
    setImages((current) => {
      if (to < 0 || to >= current.length) return current;
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  return (
    <form action={action} className="space-y-5">
      {activity && <input type="hidden" name="id" value={activity.id} />}
      <input type="hidden" name="images" value={JSON.stringify(images)} />

      {/* --- Identité ------------------------------------------------- */}
      <section className={sectionClass}>
        <h2 className="font-display text-lg font-bold">Identité</h2>
        <Field label="Nom *">
          <input
            name="name"
            required
            minLength={3}
            maxLength={120}
            defaultValue={activity?.name ?? ""}
            className={inputClass}
          />
        </Field>
        <Field
          label="Accroche *"
          hint="Une phrase, affichée dans le popup carte et les partages."
        >
          <input
            name="tagline"
            required
            minLength={10}
            maxLength={220}
            defaultValue={activity?.tagline ?? ""}
            className={inputClass}
          />
        </Field>
        <Field label="Description * (markdown, paragraphes séparés par une ligne vide)">
          <textarea
            name="description"
            required
            minLength={30}
            rows={7}
            defaultValue={activity?.description ?? ""}
            className={textareaClass}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Catégorie *">
            <select
              name="category"
              required
              defaultValue={activity?.category ?? "NATURE"}
              className={inputClass}
            >
              {ACTIVITY_CATEGORY_VALUES.map((value) => (
                <option key={value} value={value}>
                  {ACTIVITY_CATEGORIES[value].emoji}{" "}
                  {ACTIVITY_CATEGORIES[value].label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tags" hint="Séparés par des virgules (famille, gratuit, sportif…)">
            <input
              name="tags"
              defaultValue={activity?.tags.join(", ") ?? ""}
              className={inputClass}
            />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="isFeatured"
            defaultChecked={activity?.isFeatured ?? false}
            className="h-4 w-4 accent-peyi-orange-500"
          />
          Mettre en avant (remonte en tête des pages listing)
        </label>
      </section>

      {/* --- Photos ---------------------------------------------------- */}
      <section className={sectionClass}>
        <h2 className="font-display text-lg font-bold">Photos</h2>
        <label className="flex h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border text-sm text-muted-foreground transition hover:border-peyi-orange-300 hover:text-peyi-orange-700">
          <ImagePlus className="h-5 w-5" aria-hidden />
          {uploading ? "Upload en cours…" : "Ajouter des photos (12 max)"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            disabled={uploading}
            onChange={(event) => {
              void handleFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </label>
        {uploadError && (
          <p className="text-sm text-destructive">{uploadError}</p>
        )}
        {images.length > 0 && (
          <ul className="space-y-2">
            {images.map((image, index) => (
              <li
                key={image.url}
                draggable
                onDragStart={() => {
                  dragIndex.current = index;
                }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  if (dragIndex.current !== null) {
                    moveImage(dragIndex.current, index);
                    dragIndex.current = null;
                  }
                }}
                className={cn(
                  "flex items-center gap-3 rounded-md border border-border bg-background p-2",
                  index === 0 && "ring-1 ring-peyi-orange-300",
                )}
              >
                <GripVertical
                  className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground"
                  aria-hidden
                />
                <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-sm">
                  <Image
                    src={image.url}
                    alt={image.altText || "Photo de l'activité"}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </div>
                <input
                  value={image.altText}
                  onChange={(event) =>
                    setImages((current) =>
                      current.map((item, i) =>
                        i === index
                          ? { ...item, altText: event.target.value }
                          : item,
                      ),
                    )
                  }
                  placeholder="Texte alternatif (obligatoire)"
                  required
                  className={cn(inputClass, "flex-1")}
                />
                {index === 0 && (
                  <span className="shrink-0 rounded-full bg-peyi-orange-50 px-2 py-0.5 font-mono text-[10px] font-semibold text-peyi-orange-700">
                    Couverture
                  </span>
                )}
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveImage(index, index - 1)}
                    aria-label="Monter la photo"
                    className="rounded p-1 text-muted-foreground hover:text-foreground"
                  >
                    <ArrowUp className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveImage(index, index + 1)}
                    aria-label="Descendre la photo"
                    className="rounded p-1 text-muted-foreground hover:text-foreground"
                  >
                    <ArrowDown className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setImages((current) =>
                        current.filter((_, i) => i !== index),
                      )
                    }
                    aria-label="Retirer la photo"
                    className="rounded p-1 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* --- Localisation ---------------------------------------------- */}
      <section className={sectionClass}>
        <h2 className="font-display text-lg font-bold">Localisation</h2>
        <ActivityPositionPicker
          latitude={position.latitude}
          longitude={position.longitude}
          onChange={setPosition}
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Latitude *">
            <input
              name="latitude"
              required
              type="number"
              step="any"
              value={position.latitude ?? ""}
              onChange={(event) =>
                setPosition((current) => ({
                  ...current,
                  latitude: event.target.value
                    ? Number(event.target.value)
                    : null,
                }))
              }
              className={inputClass}
            />
          </Field>
          <Field label="Longitude *">
            <input
              name="longitude"
              required
              type="number"
              step="any"
              value={position.longitude ?? ""}
              onChange={(event) =>
                setPosition((current) => ({
                  ...current,
                  longitude: event.target.value
                    ? Number(event.target.value)
                    : null,
                }))
              }
              className={inputClass}
            />
          </Field>
          <Field label="Commune *">
            <select
              name="citySlug"
              required
              defaultValue={activity?.citySlug ?? ""}
              className={inputClass}
            >
              <option value="" disabled>
                Choisir…
              </option>
              {cities.map((city) => (
                <option key={city.slug} value={city.slug}>
                  {city.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Adresse">
            <input
              name="address"
              defaultValue={activity?.address ?? ""}
              className={inputClass}
            />
          </Field>
          <Field
            label="Point de départ"
            hint="Parking, dégrad, embarcadère… souvent différent du lieu lui-même."
          >
            <input
              name="startPoint"
              defaultValue={activity?.startPoint ?? ""}
              className={inputClass}
            />
          </Field>
        </div>
      </section>

      {/* --- Accès & saison -------------------------------------------- */}
      <section className={sectionClass}>
        <h2 className="font-display text-lg font-bold">Accès &amp; saison</h2>
        <Field label="Modes d'accès * (plusieurs possibles)">
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {ACCESS_MODE_VALUES.map((mode) => (
              <label key={mode} className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  name="accessModes"
                  value={mode}
                  defaultChecked={activity?.accessModes.includes(mode) ?? false}
                  className="h-4 w-4 accent-peyi-orange-500"
                />
                <span aria-hidden>{ACCESS_MODES[mode].emoji}</span>
                {ACCESS_MODES[mode].label}
              </label>
            ))}
          </div>
        </Field>
        <Field
          label="Note d'accès"
          hint="Ex. « piste dégradée après fortes pluies, 4x4 conseillé »."
        >
          <input
            name="accessNote"
            defaultValue={activity?.accessNote ?? ""}
            className={inputClass}
          />
        </Field>
        <Field label="Saisons praticables">
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {(Object.keys(SEASONS) as Season[]).map((season) => (
              <label key={season} className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  name="seasons"
                  value={season}
                  defaultChecked={activity?.seasons.includes(season) ?? false}
                  className="h-4 w-4 accent-peyi-orange-500"
                />
                {SEASONS[season].label}
              </label>
            ))}
          </div>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Durée moyenne (minutes)" hint="Ex. 150 pour 2h30, 2880 pour 2 jours.">
            <input
              name="durationMinutes"
              type="number"
              min={5}
              max={20160}
              defaultValue={activity?.durationMinutes ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label="Difficulté">
            <select
              name="difficulty"
              defaultValue={activity?.difficulty ?? ""}
              className={inputClass}
            >
              <option value="">Non renseignée</option>
              {DIFFICULTY_VALUES.map((value) => (
                <option key={value} value={value}>
                  {DIFFICULTIES[value].label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      {/* --- Tarifs & réservation --------------------------------------- */}
      <section className={sectionClass}>
        <h2 className="font-display text-lg font-bold">
          Tarifs &amp; réservation
        </h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="isFree"
            checked={isFree}
            onChange={(event) => setIsFree(event.target.checked)}
            className="h-4 w-4 accent-peyi-orange-500"
          />
          Activité gratuite
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Prix minimum (€)">
            <input
              name="priceMin"
              type="number"
              min={0}
              step="0.01"
              disabled={isFree}
              defaultValue={
                activity?.priceMinCents != null
                  ? activity.priceMinCents / 100
                  : ""
              }
              className={cn(inputClass, "disabled:opacity-50")}
            />
          </Field>
          <Field label="Prix maximum (€)">
            <input
              name="priceMax"
              type="number"
              min={0}
              step="0.01"
              disabled={isFree}
              defaultValue={
                activity?.priceMaxCents != null
                  ? activity.priceMaxCents / 100
                  : ""
              }
              className={cn(inputClass, "disabled:opacity-50")}
            />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="bookingRequired"
            defaultChecked={activity?.bookingRequired ?? false}
            className="h-4 w-4 accent-peyi-orange-500"
          />
          Réservation obligatoire
        </label>
        <Field label="URL de réservation">
          <input
            name="bookingUrl"
            type="url"
            placeholder="https://…"
            defaultValue={activity?.bookingUrl ?? ""}
            className={inputClass}
          />
        </Field>
      </section>

      {/* --- Contact ---------------------------------------------------- */}
      <section className={sectionClass}>
        <h2 className="font-display text-lg font-bold">Contact</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Téléphone">
            <input
              name="phone"
              defaultValue={activity?.phone ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label="WhatsApp">
            <input
              name="whatsapp"
              defaultValue={activity?.whatsapp ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label="Site web">
            <input
              name="website"
              type="url"
              placeholder="https://…"
              defaultValue={activity?.website ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label="Instagram">
            <input
              name="instagram"
              defaultValue={activity?.instagram ?? ""}
              className={inputClass}
            />
          </Field>
        </div>
      </section>

      {/* --- Horaires ---------------------------------------------------- */}
      <section className={sectionClass}>
        <h2 className="font-display text-lg font-bold">Horaires</h2>
        <p className="text-xs text-muted-foreground">
          Format : <code>08:00-12:00, 14:00-17:30</code>. Laisser vide = fermé
          ce jour-là. Tout vide = site en accès libre (pas d&apos;horaires).
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {DAY_KEYS.map((day) => (
            <Field key={day} label={DAY_LABELS[day]}>
              <input
                name={`hours_${day}`}
                defaultValue={dayDefault(day)}
                placeholder="08:00-12:00, 14:00-17:30"
                className={inputClass}
              />
            </Field>
          ))}
        </div>
        <Field label="Exceptions" hint="Ex. « Fermé les jours fériés — dernière entrée 16h30 ».">
          <input
            name="hours_exceptions"
            defaultValue={
              (parseOpeningHours(activity?.openingHours)?.exceptions ?? []).join(
                " — ",
              )
            }
            className={inputClass}
          />
        </Field>
      </section>

      <div className="flex items-center justify-end gap-3">
        <SubmitButton variant="peyi" pendingLabel="Enregistrement…">
          {activity ? "Enregistrer les modifications" : "Créer le brouillon"}
        </SubmitButton>
      </div>
    </form>
  );
}
