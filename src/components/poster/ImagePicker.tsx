"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { uploadFileDirect } from "@/lib/client/upload";

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB en entrée — la compression client ramène à ~500 Ko.
const ACCEPT = "image/jpeg,image/png,image/webp";

type Props = {
  /** Nom du champ hidden qui contient l'URL publique finale. */
  name?: string;
  className?: string;
  initialUrl?: string | null;
};

/**
 * Sélecteur d'image unique (couverture de bon plan). Flux :
 *
 *   1. L'utilisateur choisit un fichier
 *   2. Compression navigateur (canvas, max 1920 px, JPEG/WebP ~0,82)
 *   3. Upload direct vers Supabase Storage via URL signée
 *   4. L'URL publique finale est injectée dans un champ `<input type="hidden">`
 *      qui part avec le formulaire — le server action ne reçoit qu'une
 *      string, jamais un File.
 *
 * Résultat : la requête qui passe par Vercel ne transporte plus d'octets
 * d'image — le timeout 60 s sur Hobby ne peut plus être atteint, même
 * sur une 3G à 200 kbps.
 */
export function ImagePicker({
  name = "coverImageUrl",
  className,
  initialUrl = null,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hiddenUrlRef = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState<string | null>(initialUrl);
  const [publicUrl, setPublicUrl] = useState<string | null>(initialUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Empêche la soumission du formulaire tant qu'un upload est en cours.
  // Si le user clique "Publier" avant la fin de l'upload, on bloque
  // nativement le submit avec un message explicatif plutôt que de laisser
  // partir un form avec une URL vide.
  useEffect(() => {
    const form = hiddenUrlRef.current?.form;
    if (!form) return;
    const handler = (e: SubmitEvent) => {
      if (uploading) {
        e.preventDefault();
        setError("L'image est encore en cours d'upload — patiente 1 s.");
      }
    };
    form.addEventListener("submit", handler);
    return () => form.removeEventListener("submit", handler);
  }, [uploading]);

  function resetInput() {
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleFile(file: File | null) {
    setError(null);
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Format non supporté (JPG, PNG, WebP).");
      resetInput();
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Image trop lourde (15 Mo maximum en entrée).");
      resetInput();
      return;
    }

    // Preview locale immédiate pendant que l'upload tourne en tâche de fond.
    const blobUrl = URL.createObjectURL(file);
    setPreview((prev) => {
      if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
      return blobUrl;
    });

    setUploading(true);
    setPublicUrl(null);
    try {
      const url = await uploadFileDirect("deal", file);
      setPublicUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'upload.");
      setPreview((prev) => {
        if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
        return null;
      });
      resetInput();
    } finally {
      setUploading(false);
    }
  }

  function clear() {
    if (preview && preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    setPreview(null);
    setPublicUrl(null);
    setError(null);
    resetInput();
  }

  function openPicker() {
    inputRef.current?.click();
  }

  const hasPreview = preview !== null;

  return (
    <div className={cn("space-y-2", className)}>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />

      {/*
        Champ hidden consommé par le server action. Contient l'URL publique
        finale une fois l'upload terminé, ou "" si l'utilisateur n'a rien
        sélectionné (couverture optionnelle).
      */}
      <input
        ref={hiddenUrlRef}
        type="hidden"
        name={name}
        value={publicUrl ?? ""}
      />

      <div
        className={cn(
          "relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-lg border-2 border-dashed transition",
          hasPreview
            ? "border-transparent"
            : "border-border bg-muted/40 hover:border-peyi-orange-300 hover:bg-peyi-orange-50/30",
        )}
      >
        {hasPreview ? (
          <>
            <Image
              src={preview!}
              alt="Aperçu"
              fill
              sizes="(max-width: 640px) 100vw, 448px"
              className="object-cover"
              unoptimized
            />
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white">
                <div className="flex items-center gap-2 rounded-full bg-black/70 px-3 py-1.5 text-xs font-semibold">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  Upload en cours…
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={clear}
              disabled={uploading}
              className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80 disabled:opacity-50"
              aria-label="Retirer l'image"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={openPicker}
            className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-2 p-6 text-center"
          >
            <ImagePlus
              className="h-8 w-8 text-peyi-orange-500"
              aria-hidden
            />
            <span className="text-sm font-medium">Ajouter une image</span>
            <span className="text-xs text-muted-foreground">
              JPG, PNG ou WebP · optimisée automatiquement
            </span>
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
