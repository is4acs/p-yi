"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type DragEvent,
  type KeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  Loader2,
  Pencil,
  Trash2,
  Upload,
  X,
  ZoomIn,
} from "lucide-react";
import Cropper, { type Area } from "react-easy-crop";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { uploadFileDirect } from "@/lib/client/upload";
import {
  finalizeAvatarUploadAction,
  removeAvatarAction,
} from "@/app/profil/edit/actions";

type Props = {
  username: string;
  currentAvatarUrl: string | null;
};

const MAX_INPUT_BYTES = 15 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp";
const OUTPUT_SIZE = 512;

async function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () =>
      reject(new Error("Impossible de lire le fichier."));
    reader.readAsDataURL(file);
  });
}

async function getCroppedBlob(
  imageDataUrl: string,
  area: Area,
  size = OUTPUT_SIZE,
): Promise<Blob> {
  const image = new window.Image();
  image.src = imageDataUrl;
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Image illisible."));
  });

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponible.");

  ctx.drawImage(
    image,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    size,
    size,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Export impossible.")),
      "image/jpeg",
      0.9,
    );
  });
}

type Status = "idle" | "cropping" | "uploading" | "removing";

/**
 * AvatarUploader — composant de gestion de la photo de profil.
 *
 * Pipeline (cf. PR avatar-upload-modern) :
 *   1. Sélection (clic ou drag&drop sur la pastille)
 *   2. Recadrage circulaire interactif (react-easy-crop, pinch/scroll zoom)
 *   3. Export d'un JPEG 512×512 côté navigateur (canvas)
 *   4. Upload direct vers Supabase Storage via URL signée — Vercel ne voit
 *      jamais passer les bytes, plus de timeout 60 s sur Hobby
 *   5. `finalizeAvatarUploadAction` valide l'URL côté serveur et met à jour
 *      Prisma. Le composant fait `router.refresh()` pour rafraîchir le RSC
 *      sans full page reload.
 *
 * UX : preview optimiste pendant l'upload, fermeture Escape, body
 * scroll-lock sur la modale, drop zone visuelle, focus visibles.
 */
export function AvatarUploader({ username, currentAvatarUrl }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const [sourceDataUrl, setSourceDataUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(
    null,
  );

  const [optimisticUrl, setOptimisticUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Affichage : preview locale > URL serveur. La preview est purgée dès que
  // RSC re-render avec la nouvelle URL.
  const displayUrl = optimisticUrl ?? currentAvatarUrl;
  const hasAvatar = displayUrl !== null;
  const isUploading = status === "uploading";
  const isBusy = status !== "idle" || pending;

  // Si la prop change (RSC refresh), on purge l'optimistic blob URL pour
  // libérer la mémoire — la vraie image prend le relais.
  useEffect(() => {
    if (currentAvatarUrl && optimisticUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(optimisticUrl);
      setOptimisticUrl(null);
    }
  }, [currentAvatarUrl, optimisticUrl]);

  // Body scroll-lock pendant la modale de crop.
  useEffect(() => {
    if (status !== "cropping") return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [status]);

  // Escape ferme la modale.
  useEffect(() => {
    if (status !== "cropping") return;
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") cancelCrop();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  async function handleFileSelected(file: File | null | undefined) {
    setError(null);
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Format non supporté (JPG, PNG ou WebP).");
      return;
    }
    if (file.size > MAX_INPUT_BYTES) {
      setError("Image trop lourde (15 Mo maximum en entrée).");
      return;
    }

    try {
      const dataUrl = await readFileAsDataURL(file);
      setSourceDataUrl(dataUrl);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      setStatus("cropping");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Lecture du fichier impossible.",
      );
    }
  }

  function openPicker() {
    if (isBusy) return;
    if (inputRef.current) {
      inputRef.current.value = "";
      inputRef.current.click();
    }
  }

  function cancelCrop() {
    setSourceDataUrl(null);
    setCroppedAreaPixels(null);
    setStatus("idle");
  }

  async function confirmCrop() {
    if (!sourceDataUrl || !croppedAreaPixels) return;

    setStatus("uploading");
    setError(null);

    try {
      const blob = await getCroppedBlob(
        sourceDataUrl,
        croppedAreaPixels,
        OUTPUT_SIZE,
      );
      const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });

      // Preview optimiste — visible immédiatement sous l'overlay "Envoi…".
      const preview = URL.createObjectURL(blob);
      setOptimisticUrl((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return preview;
      });

      // Upload via URL signée Supabase (compression incluse côté lib).
      const publicUrl = await uploadFileDirect("avatar", file);

      // Persistance + validation serveur.
      const result = await finalizeAvatarUploadAction(publicUrl);
      if (!result.ok) throw new Error(result.error);

      // Purge la source de crop, refresh RSC pour récupérer la nouvelle URL.
      setSourceDataUrl(null);
      setCroppedAreaPixels(null);
      setStatus("idle");
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'upload.");
      // Retour sur la modale pour permettre un retry sans reperdre le crop.
      setStatus("cropping");
      setOptimisticUrl((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return null;
      });
    }
  }

  async function handleRemove() {
    if (!currentAvatarUrl || isBusy) return;
    if (!window.confirm("Retirer ta photo de profil ?")) return;

    setError(null);
    setStatus("removing");
    // Optimistic : on cache la photo immédiatement.
    setOptimisticUrl(null);

    try {
      const result = await removeAvatarAction();
      if (!result.ok) throw new Error(result.error);
      setStatus("idle");
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suppression impossible.");
      setStatus("idle");
    }
  }

  // Drag & drop sur la pastille avatar.
  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!isBusy) setIsDragging(true);
  }
  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }
  async function handleDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (isBusy) return;
    const file = e.dataTransfer.files?.[0];
    if (file) await handleFileSelected(file);
  }

  function handleAvatarKey(e: KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openPicker();
    }
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        onChange={(e) => handleFileSelected(e.target.files?.[0])}
      />

      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div
          role="button"
          tabIndex={isBusy ? -1 : 0}
          onClick={openPicker}
          onKeyDown={handleAvatarKey}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          aria-label={
            hasAvatar
              ? "Changer ta photo de profil"
              : "Ajouter une photo de profil"
          }
          aria-disabled={isBusy}
          className={cn(
            "group relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-peyi-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            isBusy ? "cursor-wait" : "cursor-pointer",
            isDragging
              ? "scale-105 border-solid border-peyi-orange-500 bg-peyi-orange-50"
              : hasAvatar
                ? "border-transparent"
                : "border-dashed border-border bg-peyi-orange-50/40 hover:border-peyi-orange-300 hover:bg-peyi-orange-50",
          )}
        >
          {hasAvatar ? (
            <Image
              src={displayUrl!}
              alt={`Avatar de @${username}`}
              width={112}
              height={112}
              className="h-full w-full object-cover"
              unoptimized
            />
          ) : (
            <span
              aria-hidden
              className="font-display text-2xl font-bold text-peyi-orange-700"
            >
              {username.slice(0, 2).toUpperCase()}
            </span>
          )}

          <div
            className={cn(
              "pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/55 text-white transition",
              isUploading || status === "removing"
                ? "opacity-100"
                : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100",
            )}
          >
            {isUploading || status === "removing" ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                <span className="text-[10px] font-semibold uppercase tracking-wider">
                  {isUploading ? "Envoi…" : "Suppression…"}
                </span>
              </>
            ) : (
              <>
                <Camera className="h-5 w-5" aria-hidden />
                <span className="text-[10px] font-semibold uppercase tracking-wider">
                  {hasAvatar ? "Modifier" : "Ajouter"}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex w-full flex-1 flex-col items-center gap-2 text-center sm:items-start sm:text-left">
          <p className="text-xs text-muted-foreground">
            JPG, PNG ou WebP. Glisse-dépose ou clique sur la photo. Recadrée
            en cercle 512×512 et compressée automatiquement.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={openPicker}
              disabled={isBusy}
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden />
              {hasAvatar ? "Changer" : "Ajouter une photo"}
            </Button>
            {hasAvatar && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleRemove}
                disabled={isBusy}
                className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                Retirer
              </Button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive"
        >
          {error}
        </p>
      )}

      {status === "cropping" && sourceDataUrl && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="avatar-crop-title"
          className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-sm animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between border-b border-white/10 bg-black px-4 py-3 text-white">
            <h3 id="avatar-crop-title" className="text-sm font-semibold">
              Recadre ta photo
            </h3>
            <button
              type="button"
              onClick={cancelCrop}
              aria-label="Fermer le recadrage"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <div className="relative flex-1 bg-black">
            <Cropper
              image={sourceDataUrl}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              minZoom={1}
              maxZoom={4}
              zoomSpeed={0.5}
              restrictPosition
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>

          <div className="border-t border-white/10 bg-black px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4">
            <label className="flex items-center gap-3 text-white">
              <ZoomIn className="h-4 w-4 text-white/70" aria-hidden />
              <span className="sr-only">Zoom</span>
              <input
                type="range"
                min={1}
                max={4}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                aria-label="Zoom"
                className="flex-1 accent-peyi-orange-500"
              />
            </label>

            <div className="mt-4 flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={cancelCrop}
              >
                Annuler
              </Button>
              <Button
                type="button"
                variant="peyi"
                className="flex-1"
                onClick={confirmCrop}
                disabled={!croppedAreaPixels}
              >
                <Upload className="h-4 w-4" aria-hidden />
                Valider
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
