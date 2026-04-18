"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";

import { cn } from "@/lib/utils";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp";

type Props = {
  name?: string;
  className?: string;
  initialUrl?: string | null;
};

export function ImagePicker({
  name = "coverImage",
  className,
  initialUrl = null,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(initialUrl);
  const [error, setError] = useState<string | null>(null);

  function handleFile(file: File | null) {
    setError(null);
    if (!file) {
      setPreview(null);
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Format non supporté (JPG, PNG, WebP).");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Image trop lourde (5 Mo maximum).");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview((prev) => {
      if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
      return url;
    });
  }

  function clear() {
    if (preview && preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    setPreview(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function openPicker() {
    inputRef.current?.click();
  }

  const hasPreview = preview !== null;

  return (
    <div className={cn("space-y-2", className)}>
      {/* L'input file reste monté en permanence : s'il était démonté dès
          qu'une preview apparaît, le FileList serait détruit et le form
          submit partirait sans fichier. On le cache visuellement avec
          sr-only et on déclenche le picker via le bouton au-dessus. */}
      <input
        ref={inputRef}
        name={name}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
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
            <button
              type="button"
              onClick={clear}
              className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80"
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
              JPG, PNG ou WebP · 5 Mo max
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
