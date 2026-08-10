# AUDIT Péyi — état des lieux et mise en état de production

Audit réalisé sur la branche `claude/peyi-activites-carte-zp6cmc`, environnement
local complet : PostgreSQL 16 + migrations + seed (33 activités, 39 catégories),
serveur Next en dev, crawl Chromium headless sur 14 routes × 4 largeurs
(390 / 768 / 1280–1440 / 1920) + zoom simulé 90 / 110 / 125 %.

## Corrections préalables à l'énoncé (règle 1 — hypothèses vs code réel)

| Hypothèse de la mission | Réalité du repo |
|---|---|
| Stack « NextAuth » | **Supabase Auth** (`src/lib/supabase/*`, `requireRole`), pas de NextAuth |
| Charte « #FF8A3D / #8DD954, Bricolage Grotesque » | Tokens réels : `peyi-orange #FF914C`, `peyi-green #7ED956` ; typo **Nunito** (display) + Inter + JetBrains Mono (`tailwind.config.ts`) |
| « sitemap.ts » | Convention repo : index `sitemap.xml/route.ts` + 5 fichiers `sitemap-*.xml` |

## Phase 0 — Reconnaissance

### Hygiène statique
- `TODO`/`FIXME` : **0** · `: any` : **0** · `@ts-ignore` : **0**
- `console.log` : 2 (logger `lib/log.ts` + WebVitals dev) — légitimes
- `dangerouslySetInnerHTML` : 9, tous pour du JSON-LD sérialisé via
  `serializeJsonLd` (échappe `</script>`) — sûrs
- `user-scalable=no` : absent ; viewport `maximum-scale=5` conforme

### Pages spéciales
`error.tsx`, `global-error.tsx`, `not-found.tsx`, `loading.tsx`, `robots.ts`,
`manifest.ts`, `icon.tsx`, `opengraph-image.tsx` (racine + `bons-plans/[slug]`
+ `annonces/[slug]`) : **tous présents**. Manque : OG image dédiée
`/activites/[slug]` (→ Reste à faire).

### Crawl navigateur (14 routes)
- HTTP 200 partout, **1 seul `<h1>` par page**, zéro scroll horizontal à
  390 / 768 / 1440 / 1920 px, zéro requête interne échouée.
- Seules erreurs console : tuiles carto bloquées par le proxy du bac à sable
  (openfreemap/OSM) — non reproductibles en prod, et le repli raster couvre le cas.
- Bundles > 200 kB first-load : uniquement des routes authentifiées de
  formulaire (`/poster/annonce` 243 kB, `/profil/edit` 225 kB, admin/édition).
  Aucune route publique de contenu au-dessus du seuil.

## Phase 1 — Bugs constatés : diagnostic

| # | Constat | Verdict sur le code actuel | Action |
|---|---|---|---|
| 1.1 | Header tronqué desktop | **Non reproduit** : header 65 px, aucun élément rogné sur 14 routes × 4 largeurs × 3 zooms. Aucun ancêtre `transform`/`overflow` au-dessus du header (le wrapper `overflow-x-clip` est un frère, pas un parent). | Cause la plus probable : **prod sur un déploiement antérieur**. Durci quand même : hauteur intrinsèque (`min-h-14/16` au lieu de `h-14/16`) + variable `--header-h` centralisée |
| 1.2 | Nav incohérente home vs autres pages | **Non reproduit** : nav strictement identique sur toutes les routes (Header et BottomNav sont montés une seule fois dans le layout racine). L'écart constaté correspond au prod qui sert l'ancien `main` (les évolutions nav sont sur cette branche). En revanche les deux composants dupliquaient chacun leur liste en dur — risque réel de divergence future. | **`src/config/nav.ts`** : registre unique `NAV_ITEMS` → `DESKTOP_NAV` / `MOBILE_NAV`, consommé par Header et BottomNav |
| 1.3 | Libellé brut `/annonces/remire-montjoly` | **Non reproduit** : aucun slug/URL brut dans le texte des 14 pages crawlées ; le type `ExploreLink` exige `label` et les chips affichent `short`/`label`, jamais `href`. Même conclusion : prod obsolète. | Rien à corriger sur le code actuel ; le refactor chips (commit `d22d35b`) rend le cas impossible |
| 1.4 | Pastilles « Bientôt » cliquables | **Reproduit** : 8 tuiles `<a>` sur `/` et `/annonces` menant à un listing vide (`HomeCategoriesGrid` → `CategoryTile`) | Corrigé : tuile **inerte** (`<div aria-disabled>`, sans hover d'affordance) quand la catégorie a 0 annonce ; redevient un lien dès la 1re annonce. Option « lien + état vide propre » écartée car le badge « Bientôt » promet précisément qu'il n'y a rien — à valider (voir Reste à faire) |
| 1.5 | Compteurs à zéro | **Reproduit** : `0 bons plans ce mois · 0 annonces cette semaine · 0 membres actifs` (HomeHero) + variantes sur les deux autres héros | Corrigé : composant unique **`<CommunityStats />`** — seuil `NEXT_PUBLIC_STATS_MIN_THRESHOLD` (défaut 3), compteurs sous le seuil masqués, accroche « Ouvre le bal — poste … » si aucun ne passe. Jamais de faux chiffres |

## Phases 2–9 — état et actions

### Phase 2 (layout/responsive) — largement sain, complété
- Scroll horizontal : **zéro** aux 4 largeurs (mesuré). Le garde-fou
  `overflow-x-clip` documenté du layout fait son travail.
- Ancres : ajout `--header-h` (3.5rem / 4rem sm) + `scroll-padding-top` sur
  `html` — les cibles d'ancres ne passent plus sous le header sticky.
- Bottom-nav : `pb-20 sm:pb-0` sur body + `pb-[env(safe-area-inset-bottom)]`
  sur la nav déjà en place ; le bottom-sheet activités s'arrête à `bottom-20`.
- Touch targets : chips `min-h-[40px]`+`min-h-11`, marqueurs carte 44 px,
  onglets nav ≥ 44 px — vérifiés aux sessions précédentes.
- `loading.tsx` : présents sur `/bons-plans`, `/annonces`, `/poster` ;
  skeletons dédiés sur /activites (carte + liste + sheet).

### Phase 3 (performance) — corrigé sur le point réel
- **/activites : 3 messages de chargement empilés → 1 seul** (« Chargement de
  la carte… ») ; liste desktop et sheet mobile passent en skeletons muets.
  Vérifié à t+400 ms au navigateur.
- Debounce 400 ms du « rechercher quand je déplace la carte ».
  **AbortController non applicable** : le filtrage par bornes est 100 % client
  (le GeoJSON est déjà en mémoire, aucune requête ne part au déplacement) —
  l'hypothèse de l'énoncé ne correspond pas à l'architecture.
- « Charger la carte à l'entrée dans le viewport » : **écarté** — la carte est
  le contenu principal de la page, au-dessus de la ligne de flottaison ;
  la retarder dégraderait le LCP au lieu de l'améliorer. `dynamic ssr:false`
  déjà en place.
- Images : `next/image` + `sizes` + blur partout sur les composants activités ;
  AVIF/WebP : `next.config` gère déjà les `remotePatterns` Supabase.
- Lighthouse : **non mesurable ici** (proxy réseau du bac à sable bloque tuiles
  et fonts ; chiffres non représentatifs). → Reste à faire : mesure en prod.

### Phase 4 (SEO) — déjà conforme, 1 lacune notée
- `generateMetadata` + canonical : présents sur toutes les routes publiques
  (`buildSeoMetadata`), pages piliers avec garde-fou **noindex sous 2
  résultats** (`MIN_INDEXABLE_PILLAR_ITEMS`) — exactement la « gestion du
  contenu vide » demandée.
- `robots.ts` : bloque `/admin`, `/profil`, `/messages`, `/notifications`,
  `/api` ; `/poster`, `/connexion` en meta noindex (choix documenté dans le
  fichier : évite le cas « bloqué par robots.txt mais indexé sans noindex »).
- JSON-LD : Organization + WebSite (racine), Product/Offer (deals), Offer
  (annonces), TouristAttraction (activités), CollectionPage + Breadcrumb + FAQ
  (piliers). `<h1>` unique vérifié au crawl.
- Manque : `opengraph-image` pour `/activites/[slug]` (→ Reste à faire).

### Phase 5 (accessibilité) — sain sur l'échantillon, 1 alerte contraste
- SkipLink présent et ciblant `#main-content` ; décorations héros en
  `aria-hidden` ; bottom-nav `aria-label` + `aria-current` ; formulaires de
  connexion labellisés ; focus visibles (ring) sur les interactifs contrôlés.
- **Alerte P2** : `text-peyi-orange-700` (#DB6418) sur blanc ≈ 4,0:1 — sous le
  seuil 4,5:1 pour le texte < 18 px, et utilisé très largement (liens, prix).
  Correctif global = retoucher un usage sémantique dans toute l'app : risque
  de régression visuelle large → décision demandée (voir Reste à faire).

### Phase 6 (robustesse) — 1 bug P0 trouvé et corrigé, reste sain

**P0 — les fiches d'annonce et de bon plan plantaient dès la 2e visite.**
Découvert en peuplant la base de contenu bêta : la phase 0 n'avait pas pu le
voir, faute de deals/annonces en base (0 lignes) — les fiches n'étaient donc
jamais rendues pendant le crawl.

- Symptôme : `RangeError: Invalid time value` dans `ListingDetailPage`
  (`page.tsx:337`) et `DealDetailPage` (`page.tsx:341`), page d'erreur générique
  servie à la place de la fiche. Reproduit 3 fois sur 3, sur les deux types.
- Cause : `unstable_cache` **sérialise** sa valeur de retour dans le Data
  Cache. Premier appel (MISS) → objet Prisma intact, vraies `Date`. Appels
  suivants (HIT) → les dates reviennent en **chaînes ISO**, et
  `Intl.DateTimeFormat().format("2026-08-06T…")` lève `Invalid time value`
  (puis `.toISOString()` un `TypeError` juste après).
- Portée réelle : en prod le cache reste chaud, donc **100 % des fiches
  cassées** en régime permanent — seule la toute première visite après un
  déploiement ou une invalidation passait.
- Correctif : `src/lib/cache-dates.ts` (`reviveDates`) appliqué aux 4 lectures
  cachées (`getListing`, `getListingMeta`, `getDeal`, `getDealMeta`), avec la
  liste des champs date déclarée explicitement à côté de chaque `select`.
- Vérifié : 3 chargements consécutifs × 4 fiches, 0 erreur serveur, dates
  rendues (`6 août 2026`, `il y a 4 jours`, `expire dans 2 mois`).

Le reste de la phase est sain :
- Zod sur toutes les server actions et handlers touchés lors des sessions
  (deal, listing, activité, auth, upload) ; `requireActiveUser`/`requireRole`
  systématiques ; propriété vérifiée (constaté sur actions deals/annonces).
- Uploads : whitelist MIME JPEG/PNG/WebP (SVG refusé), 5 Mo max, compression
  client, chemins serveur par UID, URLs revalidées avant écriture DB.
- Rate limiting Upstash : auth, écriture, upload, export RGPD (obligatoire en
  prod via fail-fast `env.ts`).
- Transactions : édition activité (update+images), etc. `_prisma_migrations`
  cohérent (« No pending migrations » vérifié sur base locale montée depuis
  les migrations + le script SQL Supabase).
- Index : requêtes publiques couvertes (`status+category`, `cityId+status`,
  `latitude+longitude`, etc. sur activities ; deals/listings avaient déjà les
  leurs). Pagination : offset sur admin (30/page) — cursor non nécessaire à ce
  volume (→ nice-to-have).

### Phase 7 (vides / premier lancement) — partiellement traité
- `error/global-error/not-found` : présents, design Péyi.
- États vides : /activites (2 variantes contextualisées avec CTA), /annonces,
  /bons-plans OK ; composant `<EmptyState />` unique **non fait** (refactor
  transversal → Reste à faire).
- Cold start : seed activités = contenu éditorial réel (33 fiches sourcées),
  pas de faux contenu utilisateur ; compteurs traités en 1.5.

### Phase 8 (sécurité) — déjà en place
- Headers : CSP stricte (connect-src Supabase + hôtes carto), HSTS,
  X-Frame-Options, Referrer-Policy, Permissions-Policy
  (`geolocation=(self)` pour la carte), X-Content-Type-Options
  (`next.config.mjs`).
- `NEXT_PUBLIC_*` : URL Supabase + anon key (publiques par design), site URL,
  style carto, seuil stats — aucune valeur sensible.
- Analytics : WebVitals → endpoint interne `/api/metrics`, **aucun script
  tiers** → pas de bandeau cookies requis en l'état. Pages légales présentes
  (contenu à faire relire par Isaac).
- Modération : signalements, dépublication, bans, audit log admin — en place.

### Phase 9 (outillage)
- **CI ajoutée** : `.github/workflows/ci.yml` (typecheck + lint + build avec
  env factices). 
- Tests de fumée Playwright et monitoring type Sentry : non installés sans
  validation (dépendance + DSN + coût) → Reste à faire.

## Correctifs appliqués (commits de cette passe)

| Commit | Contenu |
|---|---|
| `fix(nav)` | `src/config/nav.ts` source unique ; Header + BottomNav consomment `DESKTOP_NAV`/`MOBILE_NAV` |
| `fix(header)` | Hauteur intrinsèque `min-h-14/16` ; `--header-h` + `scroll-padding-top` globaux |
| `feat(stats)` | `<CommunityStats />` à seuil `NEXT_PUBLIC_STATS_MIN_THRESHOLD`, branché sur les 3 héros ; accroches d'action ; doc `.env.example` |
| `fix(home)` | `CategoryTile` variante `disabled` ; tuiles « Bientôt » inertes tant que la catégorie est vide |
| `perf(activites)` | Un seul message de chargement ; skeletons ; debounce 400 ms des bornes carte |
| `chore(ci)` | Workflow GitHub Actions typecheck + lint + build |
| `chore(audit)` | Ce fichier |
| `fix(cache)` | **P0** — `reviveDates` : les fiches annonce/bon plan plantaient dès la 2e visite (dates sérialisées en chaînes par le Data Cache) |
| `feat(beta)` | `supabase/beta-content.sql` — 12 bons plans + 12 annonces sous le compte éditorial `@peyi_demo`, compteurs à zéro |

Validation après chaque lot : `npx tsc --noEmit` ✅ · `next lint` 0 warning ✅ ·
`next build` exit 0, 0 warning ✅ · re-crawl navigateur des pages touchées ✅.

## Reste à faire (décisions ou hors périmètre sûr)

| Sujet | Sévérité | Pourquoi pas fait |
|---|---|---|
| **Redéployer la prod** | P0 | Les bugs 1.1/1.2/1.3 constatés en prod correspondent à un déploiement antérieur au travail de cette branche. Aucun accès prod depuis ici — merge + deploy à déclencher côté Isaac |
| Contraste `peyi-orange-700` texte (≈4,0:1) | P2 | Retouche transversale de dizaines d'usages ; proposer `peyi-orange-800` pour les petits textes — **décision produit** (nuance visuelle de marque) |
| Tuiles « Bientôt » : inertes vs filtre réel | P1 | J'ai appliqué l'option « inerte » (la plus honnête, réversible en 1 ligne). À confirmer |
| OG image `/activites/[slug]` | P2 | À générer sur le modèle deals/annonces — non critique, fiches déjà indexables avec OG photo |
| `<EmptyState />` unique | P2 | Refactor transversal de composants sains ; gain réel mais risque de régression > bénéfice immédiat |
| Lighthouse prod avant/après | P1 | Réseau du bac à sable non représentatif (tuiles/fonts bloquées). À mesurer sur peyi.gf après déploiement |
| Tests fumée Playwright + Sentry | P2 | Nouvelles dépendances / service externe — accord demandé avant installation (Sentry : DSN, quota, RGPD) |
| Pagination cursor listes publiques | P3 | Offset actuel sans problème au volume actuel |
