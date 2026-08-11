"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

export type FilterSelectOption = { value: string; label: string };

type Props = {
  name: string;
  /** Libellé affiché quand rien n'est sélectionné (option vide). */
  placeholder?: string;
  options: FilterSelectOption[];
  defaultValue?: string;
  /** Force le style « chip active » même sans valeur (ex. tri). */
  alwaysActive?: boolean;
  className?: string;
};

/**
 * FilterSelect — un `<select>` natif habillé en chip « Soleil péyi »
 * (▾ inclus). À la souris / au doigt, le formulaire parent est soumis
 * dès le changement ; au clavier (flèches), la soumission attend
 * Entrée ou la sortie du champ pour ne pas naviguer à chaque touche.
 * Un bouton submit sr-only dans le formulaire couvre le cas sans
 * JavaScript.
 */
export function FilterSelect({
  name,
  placeholder,
  options,
  defaultValue,
  alwaysActive = false,
  className,
}: Props) {
  const active = alwaysActive || Boolean(defaultValue);
  const keyboardInteraction = useRef(false);
  const submitted = useRef(false);

  function submit(form: HTMLFormElement | null) {
    if (submitted.current) return;
    submitted.current = true;
    form?.requestSubmit();
  }

  return (
    <span className={cn("relative flex-none", className)}>
      <select
        name={name}
        defaultValue={defaultValue ?? ""}
        aria-label={placeholder ?? name}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            if (event.currentTarget.value !== (defaultValue ?? "")) {
              submit(event.currentTarget.form);
            }
          } else {
            keyboardInteraction.current = true;
          }
        }}
        onChange={(event) => {
          if (!keyboardInteraction.current) {
            submit(event.currentTarget.form);
          }
        }}
        onBlur={(event) => {
          if (
            keyboardInteraction.current &&
            event.currentTarget.value !== (defaultValue ?? "")
          ) {
            submit(event.currentTarget.form);
          }
          keyboardInteraction.current = false;
        }}
        className={cn(
          "min-h-[36px] cursor-pointer appearance-none rounded-full py-[7px] pl-3.5 pr-7 text-xs outline-none",
          active
            ? "border-[1.5px] border-soleil-forest bg-soleil-forest font-bold text-soleil-cream dark:border-soleil-cream dark:bg-soleil-cream dark:text-soleil-forest"
            : "border-[1.5px] border-soleil-border bg-transparent font-semibold text-soleil-forest dark:border-soleil-border-d dark:text-soleil-cream",
        )}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[9px]",
          active
            ? "text-soleil-cream dark:text-soleil-forest"
            : "text-soleil-forest dark:text-soleil-cream",
        )}
      >
        ▾
      </span>
    </span>
  );
}
