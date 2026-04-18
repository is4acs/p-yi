/**
 * Skip link — premier élément focusable du document. Permet aux
 * utilisateurs au clavier et aux lecteurs d'écran de sauter la
 * navigation principale et d'atterrir directement sur le contenu.
 *
 * Invisible par défaut (`sr-only`), devient visible au focus via
 * `focus:not-sr-only`. Positionné en absolute top-left pour être
 * prédictible quand il apparaît.
 *
 * Cible : `#main-content` (wrapper défini dans le root layout, juste
 * après le Header).
 */
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:inline-flex focus:items-center focus:rounded-md focus:bg-peyi-orange-500 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-peyi-orange-500 focus:ring-offset-2"
    >
      Aller au contenu
    </a>
  );
}
