# Audit SEO initial — peyi.gf

## 1) Constat technique (avant implémentation)

### Stack, rendu et crawlabilité
- Framework: Next.js App Router (`src/app`), Prisma, rendu majoritairement SSR/dynamique (`dynamic = "force-dynamic"` sur pages clés).
- Le contenu principal des pages transactionnelles est rendu côté serveur (crawlable sans interaction JS).
- Liens HTML classiques présents (`<a>` / `next/link`), donc crawl interne correct.

### Routes existantes principales
- Home: `/`
- Bons plans: `/bons-plans`, détail: `/bons-plans/[slug]`
- Annonces: `/annonces`, détail: `/annonces/[slug]`
- Recherche interne: `/recherche`
- Zones privées: `/profil*`, `/messages*`, `/notifications`, `/poster*`, `/admin*`, etc.

### Templates et SEO existant
- Métadonnées globales dans `src/app/layout.tsx`.
- `generateMetadata` déjà présent sur pages transactionnelles majeures:
  - `src/app/bons-plans/page.tsx`
  - `src/app/annonces/page.tsx`
  - `src/app/bons-plans/[slug]/page.tsx`
  - `src/app/annonces/[slug]/page.tsx`
- Canonical déjà géré partiellement via `src/lib/seo/canonical.ts`.
- `robots.txt` présent via `src/app/robots.ts`.
- Sitemap présent via `src/app/sitemap.ts` (unique, non segmenté).

### Données structurées existantes
- Root JSON-LD `Organization` + `WebSite` dans `src/app/layout.tsx`.
- JSON-LD `Product/Offer` + `BreadcrumbList` sur:
  - `src/app/bons-plans/[slug]/page.tsx`
  - `src/app/annonces/[slug]/page.tsx`
- Helpers dans `src/lib/seo/json-ld.ts`.

### Champs disponibles (Prisma)
- Deals: `title`, `slug`, `description`, `price`, `originalPrice`, `discountPercent`, `currency`, `isFree`, `store`, `merchant`, `city`, `category`, `coverImageUrl`, `images`, `publishedAt`, `updatedAt`, etc.
- Annonces: `title`, `slug`, `description`, `price`, `priceType`, `type`, `condition`, `city`, `neighborhood`, `category`, `coverImageUrl`, `images`, `publishedAt`, `updatedAt`, etc.

## 2) Points forts observés
- Base SEO déjà réelle (metadata, canonical, robots, sitemap, JSON-LD).
- Détails deal/annonce déjà en URL stable canonique (`/bons-plans/[slug]`, `/annonces/[slug]`).
- Structure données locale riche (ville, catégorie, enseigne) exploitable pour SEO local.

## 3) Gaps SEO initiaux
- Pas de pages piliers locales propres en path pour:
  - `intent + Guyane`
  - `intent + ville`
  - `intent + catégorie`
  - `magasin`
- Sitemap unique (pas de sous-sitemaps pages/deals/annonces/images).
- Plusieurs pages privées/internes avaient encore des metadata indexables.
- Maillage interne local insuffisant sur ancres descriptives orientées villes/catégories/enseignes.
- Pas de section guides locale dédiée (`/guide/*`).

## 4) Arborescence SEO cible proposée

### Pôles principaux
- `/bons-plans/guyane`
- `/annonces/guyane`

### Villes (bons plans)
- `/bons-plans/cayenne`
- `/bons-plans/matoury`
- `/bons-plans/kourou`
- `/bons-plans/remire-montjoly`
- `/bons-plans/saint-laurent-du-maroni`

### Villes (annonces)
- `/annonces/cayenne`
- `/annonces/matoury`
- `/annonces/kourou`
- `/annonces/remire-montjoly`
- `/annonces/saint-laurent-du-maroni`

### Catégories annonces
- `/annonces/voitures/guyane`
- `/annonces/motos-scooters/guyane`
- `/annonces/immobilier/guyane`
- `/annonces/location-appartement/guyane`
- `/annonces/emploi-services/guyane`
- `/annonces/maison-mobilier/guyane`
- `/annonces/multimedia-tech/guyane`

### Catégories bons plans
- `/bons-plans/supermarche-alimentation/guyane`
- `/bons-plans/tech-multimedia/guyane`
- `/bons-plans/maison-electromenager/guyane`
- `/bons-plans/enfants-bebe/guyane`

### Enseignes (conditionnées au contenu réel)
- `/magasins/hyper-u-cayenne`
- `/magasins/carrefour-matoury`
- `/magasins/fnac-cayenne`
- `/magasins/darty-matoury`

### Guides éditoriaux
- `/guide/bons-plans-guyane`
- `/guide/petites-annonces-guyane`
- `/guide/vendre-sa-voiture-en-guyane`
- `/guide/trouver-un-appartement-en-guyane`
