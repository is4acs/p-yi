"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";

import { Button, type ButtonProps } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

type Props = Omit<ButtonProps, "children"> & {
  children: React.ReactNode;
  /**
   * Libellé affiché pendant la soumission (ex. "Envoi…", "Publication…").
   * Optionnel : si absent, seul le spinner apparaît.
   */
  pendingLabel?: string;
  /**
   * Override explicite du pending state — utile pour les formulaires qui
   * emballent leur action dans `useTransition` (où `useFormStatus` ne
   * déclenche pas). Quand fourni, cette valeur l'emporte sur `useFormStatus`.
   */
  pending?: boolean;
};

/**
 * Bouton de soumission avec spinner auto — s'utilise à la place de
 * `<Button type="submit">` dans n'importe quel `<form>`. Deux modes :
 *
 *  1. **Server action directe** (`<form action={serverAction}>`) : on se
 *     branche sur `useFormStatus()`, zéro config côté appelant.
 *  2. **`useTransition` custom** : l'appelant passe `pending={isPending}`
 *     et on utilise cette valeur à la place.
 *
 * Pendant le chargement, le bouton est `disabled`, porte `aria-busy` pour
 * que les lecteurs d'écran annoncent "occupé", et affiche un spinner +
 * un libellé optionnel à la place de ses children.
 */
export function SubmitButton({
  children,
  pendingLabel,
  pending: pendingProp,
  disabled,
  ...rest
}: Props) {
  const status = useFormStatus();
  const isPending = pendingProp ?? status.pending;

  return (
    <Button
      type="submit"
      disabled={disabled || isPending}
      aria-busy={isPending || undefined}
      {...rest}
    >
      {isPending ? (
        <>
          <Spinner label={pendingLabel ?? "Envoi en cours"} />
          {pendingLabel ? <span>{pendingLabel}</span> : null}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
