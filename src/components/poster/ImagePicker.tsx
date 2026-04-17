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
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Image trop lourde (5 Mo maximum).");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
  }

  function clear() {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div
        className={cn(
          "relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-lg border-2 border-dashed transition",
          preview
            ? "border-transparent"
            : "border-border bg-muted/40 hover:border-peyi-orange-300 hover:bg-peyi-orange-50/30",
        )}
      >
        {preview ? (
          <>
            <Image
              src={preview}
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
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 p-6 text-center">
            <ImagePlus
              className="h-8 w-8 text-peyi-orange-500"
              aria-hidden
            />
            <span className="text-sm font-medium">Ajouter une image</span>
            <span className="text-xs text-muted-foreground">
              JPG, PNG ou WebP · 5 Mo max
            </span>
            <input
              ref={inputRef}
              name={name}
              type="file"
              accept={ACCEPT}
              className="sr-only"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
          </label>
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
