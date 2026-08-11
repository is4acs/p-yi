import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

type Props = {
  placeholder: string;
  /** Route cible du formulaire GET (le champ s'appelle `q`). */
  action: string;
  defaultValue?: string;
  className?: string;
};

/**
 * SearchField — champ de recherche souligné (filet 2px forêt), soumis
 * en GET vers la route de liste : le rendu serveur relit `?q=`.
 */
export function SearchField({
  placeholder,
  action,
  defaultValue,
  className,
}: Props) {
  return (
    <form
      role="search"
      action={action}
      className={cn(
        "flex items-center gap-2.5 border-b-2 border-soleil-forest text-soleil-forest dark:border-soleil-cream dark:text-soleil-cream",
        className,
      )}
    >
      <Icon name="search" size={14} className="flex-none" />
      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder={placeholder}
        autoComplete="off"
        aria-label={placeholder}
        className="min-h-[44px] w-full bg-transparent text-[13.5px] font-medium outline-none placeholder:text-soleil-muted dark:placeholder:text-soleil-muted-d"
      />
    </form>
  );
}
