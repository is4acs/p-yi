# Polish responsive Soleil peyi - 2026-09-28

## Base et collaboration

- Base : `origin/main` a `a4ff720` (merge de la PR #47 de Claude).
- `git pull --ff-only` execute avant les modifications : Already up to date.
- Un fetch de controle avant livraison confirme que main n'a pas change.
- Branche : `codex/polish-responsive-20260928`.
- Message de commit : `fix(ui): polish Soleil homepage and responsive navigation`.
- Aucun retour aux anciennes branches SEO d'avril, aucune migration SQL,
  aucune modification de donnees, de secrets ou de configuration Vercel.
- L'ancien dossier de cette tache pointait vers des metadonnees Git disparues.
  Un clone propre du meme depot a donc ete utilise, sans toucher a ce dossier.

## Changements

- Conservation de la direction artistique Soleil, des polices, des couleurs,
  du mode nuit et des traductions FR/PT/HT existantes.
- Accueil elargi sur tablette, marges coherentes, titre et compteurs plus lisibles.
- Carte du deal du jour avec image non recadree et retour a la ligne des longs noms.
- Annonces avec images au ratio 4:3, titres sur deux lignes et prix multilignes.
- Recherche visible sur tous les formats avec bouton de soumission de 44 px.
  Le formulaire GET conserve les filtres existants et fonctionne au clavier.
- Navigation desktop sur deux lignes entre 1024 et 1279 px pour ne pas comprimer
  la recherche; en-tete mobile et boutons de connexion plus compacts.
- Selecteurs de langue et actions principales de 44 px, focus clavier visible,
  prise en compte de prefers-reduced-motion.
- Liens vers les communes conserves en HTML. Pas de nouveau bloc SEO massif.
  Le lien Toute la Guyane n'est plus annonce comme page courante sur l'accueil.
- Chargements deals/annonces/utilisateur de l'accueil isoles avec allSettled et
  le helper withTimeout deja present (4500 ms). Les sections chargees restent
  utilisables si une autre echoue. Compteur indisponible affiche comme un tiret,
  pas comme un faux zero. Les erreurs internes de navigation Next sont relancees.

## Verification effectuee

- `npm ci` : OK, lockfile inchange.
- `npm run type-check` : OK.
- `npm run lint` : OK, aucune erreur ESLint.
- `git diff --check` : OK.
- `npx next build` : OK, 79 pages generees. Environnement local factice, sans
  acces a la base. Les erreurs Prisma attendues sont journalisees et absorbees
  par les chemins de repli existants. Le script npm build (qui lance des
  migrations) n'a volontairement pas ete utilise.
- Build et serveur de test sans Upstash via le drapeau CI existant
  `ALLOW_NO_RATE_LIMIT=1`, uniquement pour ces processus locaux. Ne pas reporter
  ce drapeau en production. Aucune variable du projet n'a ete modifiee.
- Build servi avec `next start`, DB volontairement inaccessible : accueil HTTP
  200, un H1, title/description/canonical et liens locaux presents dans le HTML,
  messages d'indisponibilite visibles, pas de page d'erreur globale.
- Navigateur : accueil controle a 320, 390, 768, 1024, 1280 et 1440 px. Pas de
  debordement horizontal du document observe; defilement des communes volontaire
  sur mobile. Etats clairs et sombres observes.
- Donnees de demonstration injectees seulement dans le processus dev local,
  jamais dans SQL ni dans les fichiers de l'application : longs titres et noms
  sans espaces, prix mensuel important, images absentes, 4 deals et 3 annonces.
- FR, PT et HT : changement de langue confirme, aucun debordement a 320 px.
- Recherche accueil : `maison & jardin` correctement encode dans l'URL.
- Recherche annonces : tri, ville, type et prix maximum conserves apres submit.
- Recherche bons plans : tri, categorie et ville conserves, soumission au clavier
  et focus visible du bouton controles.

## Fichiers modifies

- `src/app/page.tsx`
- `src/app/annonces/page.tsx` (libelle du bouton de recherche uniquement)
- `src/app/bons-plans/page.tsx` (libelle du bouton de recherche uniquement)
- `src/app/globals.css`
- `src/components/layout/GlobalSearchBar.tsx`
- `src/components/layout/Header.tsx`
- `src/components/layout/HeaderNav.tsx`
- `src/components/soleil/FilterChips.tsx`
- `src/components/soleil/LanguageSwitcher.tsx`
- `src/components/soleil/PriceTag.tsx`
- `src/components/soleil/SearchField.tsx`
- `src/components/soleil/SectionHead.tsx`
- `CODEX.md`

Fichier cree : `docs/polish-responsive-2026-09-28.md`.

## Limites et suite

- Ce polish ne constitue pas un audit exhaustif de toutes les fiches ni une
  validation du backend de production. Les parcours connectes, publication,
  messagerie et appareils iOS physiques restent a verifier en preview.
- Les timeouts protegent le rendu mais n'annulent pas une requete Prisma deja
  en cours et ne corrigent pas une saturation du pool Supabase.
- Les titres, routes, metadonnees SEO et sitemaps existants sont conserves.
- Warning local Next sur plusieurs lockfiles parents et deprecation next lint :
  deja presents; aucune suppression de fichier utilisateur pour les masquer.
- npm ci signale 8 vulnerabilites dans les dependances existantes. Audit et mises
  a jour a traiter dans une intervention distincte, pas via npm audit fix --force.
- Apres push : attendre les checks Vercel, verifier la preview avec les vraies
  donnees, puis fusionner la PR. Aucun merge automatique en production.

## Finition et correction du cache PWA

- Second pull propre sur la branche avant cette passe; main reste a `a4ff720`.
- Premier commit `540b982` : checks Vercel reussis, PR #48 sans conflit.
- La preview Vercel demande une connexion et n'a pas pu etre validee visuellement
  avec les donnees reelles. Ne pas confondre succes du build et test du backend.
- Recherche globale : bouton de 44 px et formulaire GET natif, comme sur les
  listes. Les espaces sont normalises par la page de resultats; fonctionnement
  au clic verifie avec `maison & jardin` et des espaces en debut/fin.
- Navigation basse : cinq colonnes stables, libelles pouvant revenir a la ligne.
- Padding du body : ajout du safe-area-inset-bottom deja utilise par la nav.
  Le comportement sur un iPhone physique reste a verifier.
- Aucun resultat : message traduit explicite et tuile de publication pleine
  largeur; etat vide distingue de l'indisponibilite des donnees.

### Cache PWA

Le test de langue a revele la reapparition d'un ancien etat. Le service worker
v2 traitait toutes les requetes GET non HTML comme des fichiers statiques,
y compris les reponses RSC de Next. Le code stockait egalement du HTML pouvant
contenir un en-tete personnalise. La v3 corrige ces deux comportements :

- Reponses RSC, requetes API/auth et ressources non explicitement statiques
  exclues du cache. HTML servi directement depuis le reseau, jamais stocke.
- Cache limite aux fichiers Next statiques, logos et icones publics.
- Shell hors ligne precache sans cookies (`credentials: omit`). Plus de replay
  d'anciennes pages visitées hors ligne; seule la page hors ligne reste disponible.
- Anciens caches Peyi purges a l'activation, caches etrangers conserves.
- En-tetes private/no-store respectes, ecritures statiques attendues par le worker.

### Controles reproductibles

```sh
node --test scripts/service-worker.test.mjs
node scripts/check-polish.mjs http://localhost:3100
```

- 5 tests unitaires du worker passes (RSC, HTML frais, repli anonyme, purge,
  cache statique). Ils ne necessitent aucun secret ni reseau.
- 3 smoke checks SSR passes avec DB volontairement inaccessible : accueil,
  bons plans filtres, annonces filtrees. Verifient H1/title/description/canonical,
  noindex des filtres, formulaires GET, bouton nomme et parametres conserves.
- Tests navigateur supplementaires : navigation PT a 320 px, etat vide traduit,
  recherche globale native. Les fixtures de test restent hors depot et hors SQL.
- Build de production local : aller-retour FR/PT/FR confirme sur une origine
  locale propre. TypeScript, lint et build Next passes; smoke SSR repasse avec
  next start, sans fixtures. La page hors ligne ne promet plus de pages en cache.

Fichiers modifies pendant cette finition : `src/app/offline/page.tsx`, `src/app/layout.tsx`,
`src/app/page.tsx`, `src/components/layout/GlobalSearchBar.tsx`,
`src/components/soleil/MobileNav.tsx`, `src/components/soleil/SearchField.tsx`,
`public/sw.js`, `CODEX.md` et ce rapport.

Fichiers crees : `scripts/check-polish.mjs`, `scripts/service-worker.test.mjs`.

Message du commit de finition :
`fix(ui): finish responsive polish and prevent stale PWA renders`.
