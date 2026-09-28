import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

type Props = {
  placeholder: string;
  submitLabel: string;
  /** Route cible du formulaire GET (le champ s'appelle `q`). */
  action: string;
  defaultValue?: string;
  /** Paramètres à préserver à la soumission (tri, filtres actifs…). */
  hidden?: Record<string, string>;
  className?: string;
};

/**
 * SearchField — champ de recherche souligné (filet 2px forêt), soumis
 * en GET vers la route de liste : le rendu serveur relit `?q=`.
 */
export function SearchField({
  placeholder,
  submitLabel,
  action,
  defaultValue,
  hidden,
  className,
}: Props) {
  return (
    <form
      role="search"
      action={action}
      method="get"
      className={cn(
        "flex min-w-0 items-center gap-2.5 border-b-2 border-soleil-forest pb-1 text-soleil-forest focus-within:border-soleil-orange dark:border-soleil-cream dark:text-soleil-cream dark:focus-within:border-soleil-orange",
        className,
      )}
    >
      {hidden &&
        Object.entries(hidden)
          .filter(([, value]) => value !== "")
          .map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder={placeholder}
        autoComplete="off"
        aria-label={placeholder}
        enterKeyHint="search"
        className="min-h-[44px] min-w-0 flex-1 bg-transparent text-base font-medium outline-none placeholder:text-soleil-muted dark:placeholder:text-soleil-muted-d"
      />
      <button
        type="submit"
        aria-label={submitLabel}
        className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-soleil-forest text-soleil-cream transition hover:bg-soleil-forest/90 dark:bg-soleil-cream dark:text-soleil-forest dark:hover:bg-soleil-cream/90"
      >
        <Icon name="search" size={18} />
      </button>
    </form>
  );
}
