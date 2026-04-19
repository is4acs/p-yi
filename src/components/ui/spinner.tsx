import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** Accessible label — visible uniquement par les lecteurs d'écran. */
  label?: string;
};

/**
 * Spinner de chargement — un engrenage qui tourne pour signaler qu'une
 * tâche asynchrone est en cours (envoi d'un message, publication d'un
 * post, création d'une annonce…).
 *
 * Utilise `currentColor` pour hériter de la couleur du parent : un
 * Spinner dans un bouton primary apparaît en blanc, dans un bouton
 * ghost en gris, etc. Pas besoin de variant.
 */
export function Spinner({ className, label = "Chargement en cours" }: Props) {
  return (
    <span
      role="status"
      aria-live="polite"
      className={cn("inline-flex items-center justify-center", className)}
    >
      <svg
        className="h-4 w-4 animate-spin"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
          strokeOpacity="0.25"
        />
        <path
          d="M22 12a10 10 0 0 1-10 10"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  );
}
