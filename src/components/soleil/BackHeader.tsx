"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

type Props = {
  title: string;
  /** Cible explicite du retour ; sinon `router.back()`. */
  backHref?: string;
  /** Slot d'actions à droite (ex. bouton cœur rond 36px). */
  action?: React.ReactNode;
};

/**
 * BackHeader — en-tête des pages détail : bouton retour rond 36px bordé
 * forêt, titre display centré, slot actions à droite.
 */
export function BackHeader({ title, backHref, action }: Props) {
  const router = useRouter();
  const backClass =
    "flex h-9 w-9 flex-none items-center justify-center rounded-full border-[1.5px] border-soleil-forest text-soleil-forest dark:border-soleil-cream dark:text-soleil-cream";

  return (
    <div className="flex items-center justify-between px-5 pt-3.5">
      {backHref ? (
        <Link href={backHref} aria-label="Retour" className={backClass}>
          <ArrowLeft size={16} aria-hidden />
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Retour"
          className={backClass}
        >
          <ArrowLeft size={16} aria-hidden />
        </button>
      )}
      <div className="font-display text-[17px] font-extrabold text-soleil-forest dark:text-soleil-cream">
        {title}
      </div>
      <div className="flex min-w-9 justify-end gap-2">{action ?? null}</div>
    </div>
  );
}
