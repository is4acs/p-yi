# SEO Implementation Report — peyi.gf

## 1) Architecture créée

### Pages piliers globales
- `/bons-plans/guyane`
- `/annonces/guyane`

### Pages piliers par ville
- Bons plans:
  - `/bons-plans/cayenne`
  - `/bons-plans/matoury`
  - `/bons-plans/kourou`
  - `/bons-plans/remire-montjoly`
  - `/bons-plans/saint-laurent-du-maroni`
- Annonces:
  - `/annonces/cayenne`
  - `/annonces/matoury`
  - `/annonces/kourou`
  - `/annonces/remire-montjoly`
  - `/annonces/saint-laurent-du-maroni`

### Pages piliers catégories
- Annonces:
  - `/annonces/voitures/guyane`
  - `/annonces/motos-scooters/guyane`
  - `/annonces/immobilier/guyane`
  - `/annonces/location-appartement/guyane`
  - `/annonces/emploi-services/guyane`
  - `/annonces/maison-mobilier/guyane`
  - `/annonces/multimedia-tech/guyane`
- Bons plans:
  - `/bons-plans/supermarche-alimentation/guyane`
  - `/bons-plans/tech-multimedia/guyane`
  - `/bons-plans/maison-electromenager/guyane`
  - `/bons-plans/enfants-bebe/guyane`

### Pages enseignes
- `/magasins/hyper-u-cayenne`
- `/magasins/carrefour-matoury`
- `/magasins/fnac-cayenne`
- `/magasins/darty-matoury`

### Guides éditoriaux
- `/guide/bons-plans-guyane`
- `/guide/petites-annonces-guyane`
- `/guide/vendre-sa-voiture-en-guyane`
- `/guide/trouver-un-appartement-en-guyane`

## 2) Templates et composants SEO ajoutés/modifiés

### Nouveaux blocs réutilisables
- `src/lib/seo/metadata.ts`
- `src/lib/seo/local-pages.ts`
- `src/lib/seo/pillar-content.ts`
- `src/lib/seo/pillar-queries.ts`
- `src/components/seo/SeoBlocks.tsx`
- `src/components/seo/DealsPillarPage.tsx`
- `src/components/seo/ListingsPillarPage.tsx`
- `src/components/seo/HomePillarLinks.tsx`

### Orchestration des pages piliers
- `src/app/bons-plans/pillar-utils.tsx`
- `src/app/annonces/pillar-utils.tsx`
- `src/app/magasins/pillar-utils.tsx`

## 3) Règles SEO appliquées

### Titles / meta / H1 / canonical
- Chaque nouvelle page pilier/guide/enseigne a:
  - `title` unique
  - `meta description`
  - `H1`
  - `canonical`
  - `OG` + `Twitter`
- Les pages filtres query params (`/bons-plans?...`, `/annonces?...`) passent en `noindex` pour éviter la bloat et canonicalisent vers pages propres.

### Intro visible
- Intro éditoriale visible en haut de toutes les pages piliers/guide (contenu local Guyane, utile, non générique).

### FAQ visible + JSON-LD
- FAQ visible sur pages piliers/guide.
- Injection `FAQPage` uniquement quand FAQ réellement affichée.

## 4) Structured data en place
- Global: `Organization` + `WebSite` (root layout).
- Pages piliers/guide/enseigne: `CollectionPage` + `BreadcrumbList` (+ `FAQPage` quand présent).
- Fiches deal: `Product` + `Offer` + `BreadcrumbList`.
- Fiches annonce: schéma conditionnel:
  - `Product/Offer` ou `Service` selon catégorie,
  - pas de `Product/Offer` pour les annonces de type `DEMAND` (pour rester fidèle au contenu).

## 5) Fiches détail améliorées
- Deals:
  - ajout galerie photos (si disponible),
  - ajout date de publication + mise à jour,
  - ajout section “Voir aussi” (ville/catégorie/enseigne).
- Annonces:
  - ajout date de publication + mise à jour,
  - ajout section “Voir aussi” (ville/catégorie/global),
  - breadcrumb pointé vers URLs piliers propres.

## 6) Sitemap / robots / indexation

### Sitemaps
- Remplacement du sitemap unique par:
  - `/sitemap.xml` (index)
  - `/sitemap-pages.xml`
  - `/sitemap-deals.xml`
  - `/sitemap-annonces.xml`
  - `/sitemap-images.xml`
- Inclusion uniquement d’URLs canoniques indexables.
- Pages enseignes incluses seulement si volume de deals suffisant.

### Robots
- `robots.txt` maintenu avec ligne sitemap index.
- Blocage explicite renforcé sur zones privées/interne publication/recherche.

### Noindex ciblé
- Ajout `robots: noindex, nofollow` sur pages privées/interne:
  - `/profil*` (pages manquantes)
  - `/messages*`
  - `/poster*`
  - `/notifications`
  - `/auth/complete-profile`
  - pages édition de fiches
  - `/offline`

## 7) Maillage interne automatique
- Home -> pages piliers via bloc dédié `HomePillarLinks`.
- Pôles globaux -> villes/catégories via bloc `Explorer aussi`.
- Fiches -> pages ville/catégorie/enseigne via section “Voir aussi”.
- Guides -> liens transactionnels directs.

## 8) Champs SEO / modèle de données exploités
- Exploitation côté SEO des champs existants:
  - deals: prix, ancien prix, réduction, catégorie, ville, store, dates, images.
  - annonces: prix, type, catégorie, ville/quartier, dates, images, caractéristiques.
- Aucune propriété inventée dans JSON-LD.

## 9) Éléments restant à brancher côté contenu / BO
- Rédaction éditoriale continue sur guides (mise à jour mensuelle recommandée).
- Gouvernance qualité des pages enseignes (seuil de contenu, mise à jour offres).
- Monitoring Search Console continu (couverture + performances locales).

## 10) Backlog recommandé
- Ajouter des pages “ville + catégorie” uniquement pour les couples avec volume réel (éviter toute génération massive).
- Ajouter un module d’observabilité SEO (volumétrie indexable/noindex, pages faibles, freshness deal/listing).
- Ajouter tests E2E crawl SEO (presence title/H1/canonical/JSON-LD sur templates piliers).

## 11) Suivi Git collaboration
- `git pull` fait au début: **OUI** (`git pull --ff-only origin main`, fast-forward réussi).
- Messages de commit utilisés:
  - **`feat(seo): add local SEO architecture for Guyane pages`** (`df5a349`)
  - **`chore(seo): finalize implementation report tracking details`** (`f72abbd`)
- `git push` fait à la fin: **OUI** (`git push -u origin codex/seo-local-guyane-architecture`).

## 12) Fichiers créés / modifiés

### Fichiers créés
- `checklists/search-console.md`
- `seo-audit-initial.md`
- `seo-implementation-report.md`
- `src/app/annonces/[slug]/guyane/page.tsx`
- `src/app/annonces/cayenne/page.tsx`
- `src/app/annonces/guyane/page.tsx`
- `src/app/annonces/kourou/page.tsx`
- `src/app/annonces/matoury/page.tsx`
- `src/app/annonces/pillar-utils.tsx`
- `src/app/annonces/remire-montjoly/page.tsx`
- `src/app/annonces/saint-laurent-du-maroni/page.tsx`
- `src/app/bons-plans/[slug]/guyane/page.tsx`
- `src/app/bons-plans/cayenne/page.tsx`
- `src/app/bons-plans/guyane/page.tsx`
- `src/app/bons-plans/kourou/page.tsx`
- `src/app/bons-plans/matoury/page.tsx`
- `src/app/bons-plans/pillar-utils.tsx`
- `src/app/bons-plans/remire-montjoly/page.tsx`
- `src/app/bons-plans/saint-laurent-du-maroni/page.tsx`
- `src/app/guide/[slug]/page.tsx`
- `src/app/magasins/[slug]/page.tsx`
- `src/app/magasins/pillar-utils.tsx`
- `src/app/sitemap-annonces.xml/route.ts`
- `src/app/sitemap-deals.xml/route.ts`
- `src/app/sitemap-images.xml/route.ts`
- `src/app/sitemap-pages.xml/route.ts`
- `src/app/sitemap.xml/route.ts`
- `src/components/seo/DealsPillarPage.tsx`
- `src/components/seo/HomePillarLinks.tsx`
- `src/components/seo/ListingsPillarPage.tsx`
- `src/components/seo/SeoBlocks.tsx`
- `src/lib/seo/local-pages.ts`
- `src/lib/seo/metadata.ts`
- `src/lib/seo/pillar-content.ts`
- `src/lib/seo/pillar-queries.ts`
- `src/lib/seo/sitemap.ts`

### Fichiers modifiés
- `src/app/annonces/[slug]/edit/page.tsx`
- `src/app/annonces/[slug]/page.tsx`
- `src/app/annonces/page.tsx`
- `src/app/auth/complete-profile/page.tsx`
- `src/app/bons-plans/[slug]/edit/page.tsx`
- `src/app/bons-plans/[slug]/page.tsx`
- `src/app/bons-plans/page.tsx`
- `src/app/layout.tsx`
- `src/app/messages/[username]/page.tsx`
- `src/app/messages/page.tsx`
- `src/app/notifications/page.tsx`
- `src/app/offline/page.tsx`
- `src/app/page.tsx`
- `src/app/poster/annonce/page.tsx`
- `src/app/poster/page.tsx`
- `src/app/profil/affiliation/page.tsx`
- `src/app/profil/edit/page.tsx`
- `src/app/profil/favoris/page.tsx`
- `src/app/profil/page.tsx`
- `src/app/profil/recompenses/page.tsx`
- `src/app/profil/verifier-telephone/page.tsx`
- `src/app/robots.ts`
- `src/lib/deals/queries.ts`
- `src/lib/seo/json-ld.ts`
- `src/middleware.ts`

### Fichier supprimé
- `src/app/sitemap.ts`
