/**
 * Classes partagées des champs de formulaire « Soleil péyi » — la même
 * paire label/input est utilisée par la connexion, la réinitialisation
 * de mot de passe, le contact vendeur, la messagerie, l'onboarding et
 * les panneaux de filtres du catalogue. Un seul endroit à toucher au
 * prochain ajustement de style.
 */
export const LABEL_CLASS =
  "text-[11px] font-extrabold uppercase tracking-[0.5px] text-soleil-muted2 dark:text-soleil-muted-d";

export const INPUT_CLASS =
  "w-full rounded-[14px] border-[1.5px] border-soleil-border bg-soleil-input px-3.5 py-3 text-[14px] font-semibold text-soleil-forest placeholder:font-medium placeholder:text-soleil-muted focus:border-soleil-forest focus:outline-none dark:border-soleil-border-d dark:bg-soleil-forest dark:text-soleil-cream dark:placeholder:text-soleil-muted-d dark:focus:border-soleil-cream";
