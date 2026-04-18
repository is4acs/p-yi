"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ImagePlus, Loader2, Star, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { uploadFilesDirect } from "@/lib/client/upload";

const MAX_BYTES_INPUT = 15 * 1024 * 1024; // 15 MB avant compression.
const ACCEPT = "image/jpeg,image/png,image/webp";
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

/**
 * Représentation locale d'une photo :
 *   - `existing` : déjà stockée sur Supabase (mode édition).
 *   - `new`      : fichier local, en cours ou fin d'upload direct.
 * On stocke `previewUrl` dans les deux cas pour la grille, `url` n'est
 * présent que pour les photos accessibles publiquement (upload OK).
 */
type PhotoItem =
  | { kind: "existing"; url: string }
  | {
      kind: "new";
      id: string;
      previewUrl: string;
      status: "uploading" | "uploaded" | "error";
      url?: string;
      error?: string;
    };

type Props = {
  /** URLs déjà présentes (mode édition), dans l'ordre d'affichage. */
  initialUrls?: string[];
  /** Nombre maximum de photos autorisées (dépend de la catégorie). */
  max: number;
  className?: string;
};

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Galerie multi-photos. Diff vs. la version précédente :
 *   - upload direct navigateur → Supabase (aucun byte ne passe par Vercel)
 *   - compression canvas 1920 px + re-encode JPEG/WebP → ~10× plus léger
 *   - uploads en parallèle → 10 photos passent en temps du plus lent, pas
 *     en somme cumulée (avant : boucle séquentielle serveur)
 *   - le form ne transporte plus que `photoUrls` (JSON d'URLs publiques)
 */
export function PhotosUploader({ initialUrls = [], max, className }: Props) {
  const initial: PhotoItem[] = useMemo(
    () => initialUrls.map((url) => ({ kind: "existing" as const, url })),
    // Stringify pour ne pas réinitialiser à chaque render si le tableau
    // passé en props a les mêmes éléments mais une ref différente.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [initialUrls.join("|")],
  );

  const [photos, setPhotos] = useState<PhotoItem[]>(initial);
  const [error, setError] = useState<string | null>(null);
  const pickerRef = useRef<HTMLInputElement>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);

  /* ------------------------------------------------------------------ *
   * Nettoyage des blob: URLs au unmount pour éviter les fuites mémoire.
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
   * URLs finales pour le submit : on garde l'ordre de la grille, on
   * n'émet que les photos effectivement résolues (existing OU
   * uploaded). Les "uploading/error" sont omises — si le user submit
   * pendant un upload, la photo est simplement absente (et un listener
   * ci-dessous bloque le submit de toute façon).
   * ------------------------------------------------------------------ */
  const finalUrls: string[] = useMemo(
    () =>
      photos.flatMap((p) => {
        if (p.kind === "existing") return [p.url];
        if (p.kind === "new" && p.status === "uploaded" && p.url) return [p.url];
        return [];
      }),
    [photos],
  );

  const anyUploading = photos.some(
    (p) => p.kind === "new" && p.status === "uploading",
  );

  // Bloque le submit du formulaire tant qu'un upload est en cours.
  useEffect(() => {
    const form = hiddenRef.current?.form;
    if (!form) return;
    const handler = (e: SubmitEvent) => {
      if (anyUploading) {
        e.preventDefault();
        setError("Upload en cours — patiente quelques secondes.");
      }
    };
    form.addEventListener("submit", handler);
    return () => form.removeEventListener("submit", handler);
  }, [anyUploading]);

  /* ------------------------------------------------------------------ *
   * Handlers
   * ------------------------------------------------------------------ */
  async function handleFiles(fileList: FileList | null) {
    setError(null);
    if (!fileList || fileList.length === 0) return;

    const remaining = max - photos.length;
    if (remaining <= 0) {
      setError(`Maximum ${max} photos.`);
      return;
    }

    const incoming = Array.from(fileList).slice(0, remaining);
    const accepted: { file: File; id: string; previewUrl: string }[] = [];
    for (const file of incoming) {
      if (!ACCEPTED.includes(file.type)) {
        setError("Format non supporté (JPG, PNG, WebP uniquement).");
        continue;
      }
      if (file.size > MAX_BYTES_INPUT) {
        setError("Une image dépasse 15 Mo — réduis-la avant d'ajouter.");
        continue;
      }
      accepted.push({
        file,
        id: newId(),
        previewUrl: URL.createObjectURL(file),
      });
    }
    if (accepted.length === 0) return;

    if (fileList.length > remaining) {
      setError(
        `Seulement ${remaining} photo${remaining > 1 ? "s" : ""} ajoutée${
          remaining > 1 ? "s" : ""
        } (maximum ${max}).`,
      );
    }

    // Pousse les placeholders en "uploading" immédiatement pour un feedback
    // instantané, même si la compression + upload prennent 1-2 s par image.
    const placeholders: PhotoItem[] = accepted.map((a) => ({
      kind: "new" as const,
      id: a.id,
      previewUrl: a.previewUrl,
      status: "uploading" as const,
    }));
    setPhotos((prev) => [...prev, ...placeholders]);

    // Reset le picker pour qu'on puisse re-sélectionner le même fichier.
    if (pickerRef.current) pickerRef.current.value = "";

    try {
      const urls = await uploadFilesDirect(
        "listing",
        accepted.map((a) => a.file),
      );
      // Marque chaque placeholder comme uploadé avec son URL publique.
      setPhotos((prev) =>
        prev.map((p) => {
          if (p.kind !== "new") return p;
          const idx = accepted.findIndex((a) => a.id === p.id);
          if (idx === -1) return p;
          return { ...p, status: "uploaded" as const, url: urls[idx] };
        }),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Échec de l'upload.";
      setPhotos((prev) =>
        prev.map((p) => {
          if (p.kind !== "new") return p;
          const isMine = accepted.some((a) => a.id === p.id);
          if (!isMine || p.status !== "uploading") return p;
          return { ...p, status: "error" as const, error: message };
        }),
      );
      setError(message);
    }
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
          JPG · PNG · WebP · optimisées automatiquement
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {photos.map((photo, i) => {
          const url = photo.kind === "existing" ? photo.url : photo.previewUrl;
          const isCover = i === 0;
          const isUploading = photo.kind === "new" && photo.status === "uploading";
          const isError = photo.kind === "new" && photo.status === "error";
          return (
            <div
              key={photo.kind === "existing" ? `e-${photo.url}` : `n-${photo.id}`}
              className={cn(
                "group relative aspect-square overflow-hidden rounded-lg border bg-muted",
                isError
                  ? "border-destructive ring-1 ring-destructive/40"
                  : isCover
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

              {isCover && !isError && (
                <span className="absolute left-1 top-1 inline-flex items-center gap-0.5 rounded-full bg-peyi-orange-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white shadow">
                  <Star className="h-2.5 w-2.5" aria-hidden />
                  Couverture
                </span>
              )}

              {isUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                </div>
              )}

              {isError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-destructive/70 p-1 text-center text-white">
                  <AlertCircle className="h-5 w-5" aria-hidden />
                  <span className="text-[9px] font-semibold leading-tight">
                    Échec
                  </span>
                </div>
              )}

              <button
                type="button"
                onClick={() => removeAt(i)}
                aria-label={`Supprimer la photo ${i + 1}`}
                className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80"
              >
                <Trash2 className="h-3 w-3" aria-hidden />
              </button>

              {!isCover && !isUploading && !isError && (
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
        Champ hidden consommé par le server action : JSON array ordonné
        des URLs publiques finales (cover en tête). Une photo encore en
        cours d'upload n'y figure pas ; le submit est bloqué dans ce cas
        par le listener ci-dessus.
      */}
      <input
        ref={hiddenRef}
        type="hidden"
        name="photoUrls"
        value={JSON.stringify(finalUrls)}
      />
    </div>
  );
}
