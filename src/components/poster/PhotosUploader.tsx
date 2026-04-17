"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, Star, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB — matches server-side MAX_IMAGE_BYTES
const ACCEPT = "image/jpeg,image/png,image/webp";

/**
 * Client-side representation of one slot in the gallery. Either :
 *  - an existing photo already stored on Supabase (we just need to keep
 *    track of its URL + order);
 *  - a brand-new File the user picked locally, previewed via
 *    URL.createObjectURL so they see it before submit.
 */
type PhotoItem =
  | { kind: "existing"; url: string }
  | { kind: "new"; file: File; previewUrl: string };

/**
 * Shape sent to the server so it can reassemble the final gallery order.
 * Strings for tags, because encoding an array of variants in FormData is a
 * pain (and JSON.parse on the server is cheap).
 *
 * - existing:<url>  → keep the photo at this URL
 * - new:<N>         → take the Nth File from `formData.getAll("newPhotos")`
 */
export type PhotoOrderToken = `existing:${string}` | `new:${number}`;

type Props = {
  /** URLs of photos already on the listing (edit mode). Pre-ordered. */
  initialUrls?: string[];
  /** Max number of photos allowed (depends on category). */
  max: number;
  className?: string;
};

/**
 * Multi-photo uploader for listings. Presents a grid of tiles the user can
 * :
 *  - add (up to `max`)
 *  - remove individually
 *  - promote to "couverture" (= move to position 0)
 *
 * The **first** photo is always the cover — we surface that in the UI so
 * the user knows which shot buyers will see first on listing cards.
 *
 * Form integration : we write two hidden inputs next to the render
 * (`newPhotos` file input + `photoOrder` JSON) that the submit picks up.
 * The server walks `photoOrder` to rebuild the final URL list.
 */
export function PhotosUploader({ initialUrls = [], max, className }: Props) {
  const initial: PhotoItem[] = useMemo(
    () => initialUrls.map((url) => ({ kind: "existing", url })),
    // Intentionally stringify so we don't re-init on every render if the
    // caller passes a new array literal with the same contents.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [initialUrls.join("|")],
  );

  const [photos, setPhotos] = useState<PhotoItem[]>(initial);
  const [error, setError] = useState<string | null>(null);
  const pickerRef = useRef<HTMLInputElement>(null);
  const hiddenFilesRef = useRef<HTMLInputElement>(null);

  /* ------------------------------------------------------------------ *
   * Preview URL lifecycle : revoke object URLs when they're removed to
   * avoid leaking memory if the user adds/removes lots of photos.
   * ------------------------------------------------------------------ */
  useEffect(() => {
    return () => {
      for (const p of photos) {
        if (p.kind === "new") URL.revokeObjectURL(p.previewUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ------------------------------------------------------------------ *
   * Hidden file input sync. Instead of submitting a raw FileList we build
   * one that matches the order of our local state via the DataTransfer
   * API — required because React can't set `.files` on a file input
   * through normal props (security model).
   * ------------------------------------------------------------------ */
  useEffect(() => {
    const input = hiddenFilesRef.current;
    if (!input) return;
    const dt = new DataTransfer();
    for (const p of photos) {
      if (p.kind === "new") dt.items.add(p.file);
    }
    input.files = dt.files;
  }, [photos]);

  /* ------------------------------------------------------------------ *
   * Build photoOrder tokens. Walk the ordered state; every "new" photo
   * gets a numeric index matching its position in the FileList above.
   * ------------------------------------------------------------------ */
  const photoOrder: PhotoOrderToken[] = useMemo(() => {
    const tokens: PhotoOrderToken[] = [];
    let newIdx = 0;
    for (const p of photos) {
      if (p.kind === "existing") tokens.push(`existing:${p.url}`);
      else tokens.push(`new:${newIdx++}`);
    }
    return tokens;
  }, [photos]);

  /* ------------------------------------------------------------------ *
   * Handlers
   * ------------------------------------------------------------------ */
  function handleFiles(fileList: FileList | null) {
    setError(null);
    if (!fileList || fileList.length === 0) return;

    const remaining = max - photos.length;
    if (remaining <= 0) {
      setError(`Maximum ${max} photos.`);
      return;
    }

    const incoming = Array.from(fileList).slice(0, remaining);
    const accepted: PhotoItem[] = [];
    for (const file of incoming) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        setError("Format non supporté (JPG, PNG, WebP uniquement).");
        continue;
      }
      if (file.size > MAX_BYTES) {
        setError("Une image dépasse 5 Mo — réduis-la avant d'uploader.");
        continue;
      }
      accepted.push({
        kind: "new",
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }
    if (accepted.length === 0) return;

    if (fileList.length > remaining) {
      setError(`Seulement ${remaining} photo${remaining > 1 ? "s" : ""} ajoutée${remaining > 1 ? "s" : ""} (maximum ${max}).`);
    }

    setPhotos((prev) => [...prev, ...accepted]);

    // Reset the picker so picking the same file twice in a row still fires.
    if (pickerRef.current) pickerRef.current.value = "";
  }

  function removeAt(index: number) {
    setPhotos((prev) => {
      const target = prev[index];
      if (target?.kind === "new") URL.revokeObjectURL(target.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }

  function makeCoverAt(index: number) {
    if (index === 0) return;
    setPhotos((prev) => {
      const next = [...prev];
      const [chosen] = next.splice(index, 1);
      next.unshift(chosen);
      return next;
    });
  }

  /* ------------------------------------------------------------------ *
   * Render
   * ------------------------------------------------------------------ */
  const canAddMore = photos.length < max;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          Photos{" "}
          <span className="text-muted-foreground">
            ({photos.length}/{max})
          </span>
        </span>
        <span className="text-[11px] text-muted-foreground">
          JPG · PNG · WebP · 5 Mo max
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {photos.map((photo, i) => {
          const url = photo.kind === "existing" ? photo.url : photo.previewUrl;
          const isCover = i === 0;
          return (
            <div
              key={
                photo.kind === "existing"
                  ? `e-${photo.url}`
                  : `n-${photo.previewUrl}`
              }
              className={cn(
                "group relative aspect-square overflow-hidden rounded-lg border bg-muted",
                isCover
                  ? "border-peyi-orange-400 ring-1 ring-peyi-orange-300"
                  : "border-border",
              )}
            >
              <Image
                src={url}
                alt={`Photo ${i + 1}`}
                fill
                sizes="(max-width: 640px) 33vw, 25vw"
                className="object-cover"
                unoptimized
              />

              {isCover && (
                <span className="absolute left-1 top-1 inline-flex items-center gap-0.5 rounded-full bg-peyi-orange-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white shadow">
                  <Star className="h-2.5 w-2.5" aria-hidden />
                  Couverture
                </span>
              )}

              <button
                type="button"
                onClick={() => removeAt(i)}
                aria-label={`Supprimer la photo ${i + 1}`}
                className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100 sm:opacity-0"
                style={{ opacity: 1 }}
              >
                <Trash2 className="h-3 w-3" aria-hidden />
              </button>

              {!isCover && (
                <button
                  type="button"
                  onClick={() => makeCoverAt(i)}
                  className="absolute inset-x-1 bottom-1 inline-flex items-center justify-center gap-1 rounded-md bg-black/70 px-1.5 py-1 text-[10px] font-medium text-white transition hover:bg-black/85"
                >
                  <Star className="h-3 w-3" aria-hidden />
                  Couverture
                </button>
              )}
            </div>
          );
        })}

        {canAddMore && (
          <label
            className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border bg-muted/40 p-2 text-center transition hover:border-peyi-orange-300 hover:bg-peyi-orange-50/30"
            aria-label="Ajouter une photo"
          >
            <ImagePlus className="h-6 w-6 text-peyi-orange-500" aria-hidden />
            <span className="text-[11px] font-medium">Ajouter</span>
            <input
              ref={pickerRef}
              type="file"
              accept={ACCEPT}
              multiple
              className="sr-only"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </label>
        )}
      </div>

      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}

      {photos.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Au moins une photo rend ton annonce 5× plus visible.
        </p>
      )}

      {/*
        Hidden inputs picked up by the server action :
          - `newPhotos`  : File[] in the order they appear in `photos` (via
                           a DataTransfer sync inside the effect above)
          - `photoOrder` : JSON array of tokens telling the server how to
                           reassemble the gallery
      */}
      <input
        ref={hiddenFilesRef}
        type="file"
        name="newPhotos"
        accept={ACCEPT}
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden
      />
      <input
        type="hidden"
        name="photoOrder"
        value={JSON.stringify(photoOrder)}
      />
    </div>
  );
}
