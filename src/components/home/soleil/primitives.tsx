import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * Primitives partagées par les sections de l'accueil « Soleil péyi ».
 * Elles ne portent aucune donnée : uniquement la grammaire visuelle de
 * la direction, pour qu'un même motif ne soit pas réécrit dans cinq
 * fichiers avec cinq valeurs légèrement différentes.
 */

/**
 * Placeholder d'image rayé à 45°.
 *
 * Les visuels définitifs n'existent pas encore (photos d'annonces,
 * visuel de campagne, activités). Plutôt qu'un aplat gris, la maquette
 * demande une surface rayée qui se lit comme « image à venir » et non
 * comme « image cassée ». À remplacer par `next/image` dès que les
 * visuels arrivent.
 */
export function StripedImage({
  className,
  label,
}: {
  className?: string;
  /** Étiquette technique au centre (« photo pirogue »). */
  label?: string;
}) {
  return (
    <div
      className={cn(
        "peyi-stripes flex items-center justify-center overflow-hidden rounded-md bg-surface font-mono text-[10px] text-subtle",
        className,
      )}
    >
      {label}
    </div>
  );
}

/**
 * Pastille de température — cercle bordé d'orange, chiffre en orange
 * lisible. Le `+` fait partie de la valeur : une température Péyi est
 * toujours signée.
 */
export function TemperatureCircle({
  temperature,
  size = 44,
  className,
}: {
  temperature: number;
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-label={`Température ${temperature > 0 ? "+" : ""}${temperature} degrés`}
      className={cn(
        "flex flex-none items-center justify-center rounded-full border-2 border-peyi-orange-500 font-display text-[11.5px] font-extrabold text-accent-text",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {temperature > 0 ? "+" : ""}
      {temperature}°
    </span>
  );
}

/** En-tête de section : titre display + lien « Tout voir » en orange. */
export function SectionHead({
  title,
  linkLabel,
  href,
}: {
  title: string;
  linkLabel: string;
  href: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <h2 className="font-display text-xl font-extrabold tracking-tight">
        {title}
      </h2>
      <Link
        href={href}
        className="shrink-0 text-xs font-bold text-accent-text hover:underline"
      >
        {linkLabel}
      </Link>
    </div>
  );
}

/** Sur-titre en petites capitales très espacées, orange lisible. */
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-extrabold uppercase tracking-[2.2px] text-accent-text">
      {children}
    </p>
  );
}
