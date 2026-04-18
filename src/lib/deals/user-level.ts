// Backward-compat re-export : ce module a été absorbé par la bibliothèque
// de gamification. On garde cet alias pour ne pas casser les imports
// existants (`/profil/page.tsx` et tout ce qui consomme `LEVEL_META`).
export { LEVEL_META } from "@/lib/gamification/levels";
