# Péyi — État du projet

> Snapshot daté du **2026-04-27**.
> Source unique pour piger en 5 min : c'est quoi Péyi, où on en est, ce qui suit.

---

## 1. C'est quoi Péyi ?

Péyi est une **PWA communautaire 100% Guyane** : bons plans, petites annonces et commerces locaux, dans une seule app installable. L'idée est de remplacer le mix Facebook groupes / Le Bon Coin / Dealabs par un produit **pensé pour la Guyane** — villes, enseignes, langage, communauté.

- **Domaine** : `peyi.gf`
- **Cible** : habitants de Guyane (Cayenne, Matoury, Kourou, Rémire-Montjoly, Saint-Laurent-du-Maroni en priorité)
- **Modèle** : gratuit, communautaire (vote, signalement, modération), monétisation à venir
- **Porteur** : Isaac Settou (École 42), projet personnel — code propriétaire, pas d'open contributions pour l'instant

### Ce que l'app fait aujourd'hui

**Côté utilisateur**
- Bons plans : partage, vote (hot / new / top), expiration, multi-images
- Petites annonces : achat / vente / don / location, filtres avancés (prix, km, surface, carburant…)
- Messagerie thread par conversation (rattachée à un listing)
- Favoris (deals + listings), profils avec karma + XP, signalements (S21)
- PWA installable iOS / Android avec icône custom

**Côté admin / modération**
- Rôles hiérarchiques `USER < MODERATOR < ADMIN < SUPER_ADMIN`
- Dashboard back-office : users, signalements, logs, bans temporaires/permanents, rétrogradation, suppression
- Audit trail polymorphique (`targetType` + `targetId`)

**RGPD**
- Hub `/profil/confidentialite` : export JSON, anonymisation, suppression
- Anonymisation des commentaires qui ont des réponses (pour pas casser l'arbre), suppression du reste
- Runbook complet → `docs/rgpd.md`

---

## 2. Stack technique

| Couche            | Techno                                              |
| ----------------- | --------------------------------------------------- |
| Frontend          | Next.js 15 (App Router, RSC), React 18, TypeScript strict |
| Styling           | Tailwind + design system Péyi v1.0 (orange/vert + Nunito) |
| UI                | Radix UI, Lucide, Sonner                            |
| Backend           | Server actions + route handlers Next                |
| DB                | PostgreSQL (Supabase) + Prisma 5                    |
| Auth              | Supabase Auth (email + OTP phone + Google OAuth)    |
| Storage           | Supabase Storage (images deals + listings)          |
| Rate limit        | Upstash Redis (sliding window)                      |
| Validation        | Zod 4 (env + inputs)                                |
| Observability     | Logger JSON stdout + Core Web Vitals reporter       |
| SEO               | Sitemap dynamique + robots + JSON-LD + OG images    |
| PWA               | Service Worker natif + `manifest.webmanifest`       |

Hébergement : **Vercel** (front) + **Supabase** (DB / Auth / Storage) + **Upstash** (rate limit).

---

## 3. Où on en est — état au 27/04/2026

### Ce qui est fait, en prod

- **Coeur produit** : deals, annonces, messagerie, favoris, profils, signalements — tout fonctionnel
- **Modération** : back-office complet avec rôles, bans, audit trail
- **RGPD** : export, anonymisation, suppression — alignés avec les obligations
- **PWA** : installable, service worker en place, OG images dynamiques
- **SEO local Guyane (gros chantier récent)** :
  - Pages piliers globales : `/bons-plans/guyane`, `/annonces/guyane`
  - Pages piliers par ville (×5) : Cayenne, Matoury, Kourou, Rémire-Montjoly, Saint-Laurent
  - Pages piliers par catégorie (annonces ×7, deals ×4)
  - Pages enseignes : Hyper U Cayenne, Carrefour Matoury, Fnac Cayenne, Darty Matoury
  - Guides éditoriaux : `/guide/bons-plans-guyane`, `/guide/petites-annonces-guyane`, `/guide/vendre-sa-voiture-en-guyane`, `/guide/trouver-un-appartement-en-guyane`
  - Sitemap segmenté : index + `pages` / `deals` / `annonces` / `images`
  - JSON-LD : `Organization`, `WebSite`, `CollectionPage`, `BreadcrumbList`, `FAQPage`, `Product/Offer`, `Service`
  - Maillage interne via `HomePillarLinks` (chips + anchor text `sr-only` pour rester lisible)
  - Vérification Search Console déposée (`public/google21822fef88989806.html`)
- **Robustesse render** (chantier majeur des dernières semaines) :
  - Helper `with-timeout` pour fail-fast sur appels lents
  - Durcissement de toutes les routes critiques (`/bons-plans`, `/annonces`, fiches détail, layout root)
  - Middleware Supabase tolérant aux pannes
  - Sitemap qui renvoie un XML vide plutôt que 500 si la DB tombe
  - Smoke-test 30 routes en mode DB injoignable : 30 OK / 0 fail

### Branche de travail courante

- `claude/create-project-status-doc-l0Xx2` (branche du présent doc)
- `main` à jour, dernier merge : `f877989` (SEO local Guyane)

### Ce qui reste fragile / à surveiller

- Les pages enseignes ne sortent dans le sitemap **que** si elles ont assez de deals — gouvernance contenu à mettre en place
- Pas encore de Sentry ni Datadog : si volume explose, `/api/client-errors` + logs ne suffiront plus
- Pas de tests E2E SEO automatisés (présence title/H1/canonical/JSON-LD sur templates piliers)
- Sans `UPSTASH_REDIS_*` en prod : rate limit en no-op → spam auth / abus signalements possibles
- Couverture Search Console pas encore mesurée sur tout le set de pages locales

---

## 4. Ce qu'on va faire — backlog priorisé

### Court terme (semaines à venir)

1. **Suivi indexation Search Console**
   - Soumettre les sous-sitemaps, inspecter les 8 URLs prioritaires (cf. `checklists/search-console.md`)
   - Surveiller "Explorée, actuellement non indexée" sur les pages piliers
   - Vérifier que les pages privées restent bien `noindex`
2. **Contenu éditorial des guides**
   - Mise à jour mensuelle des 4 guides existants
   - Décider si on ouvre d'autres pages "ville + catégorie" (uniquement quand le volume réel le justifie)
3. **Observabilité SEO**
   - Module pour suivre volumétrie indexable / noindex, freshness deals/listings, pages faibles
4. **Tests E2E SEO**
   - Crawl automatisé qui vérifie title / H1 / canonical / JSON-LD sur les templates piliers

### Moyen terme

5. **Monétisation / pro**
   - Pages enseignes plus riches (offres, infos pratiques)
   - Réflexion sur un modèle "pro" pour les commerces (à cadrer)
6. **Qualité du contenu**
   - Gouvernance qualité sur les pages enseignes (seuil de contenu, fraîcheur des offres)
   - Améliorer la modération des deals expirés / doublons
7. **Performance**
   - Surveiller Core Web Vitals mobile en priorité (rapport `/api/metrics`)
   - Optimiser les images (lazy + format moderne) sur les fiches détail
8. **Observabilité prod**
   - Évaluer Sentry / Datadog si le volume justifie (logs JSON + client-errors suffisent encore)

### Long terme / idées

- Notifications push web (déjà `web-push` en dépendance, à brancher)
- Système de niveaux / récompenses plus poussé (déjà karma + XP, à enrichir)
- Affiliation enseignes / partenariats locaux
- Module communautaire (forums ? sondages locaux ?) — à valider selon usage réel

---

## 5. Comment bosser sur le repo

```bash
# Setup
npm install          # déclenche prisma generate
cp .env.example .env.local   # remplir Supabase + NEXT_PUBLIC_SITE_URL
npm run db:push      # première fois
npm run db:seed      # catégories + communes
npm run dev          # http://localhost:3000

# Avant un push
npm run preflight    # type-check + lint + build + audit
```

**Conventions clés** (rappel rapide — détails dans `README.md`)
- TypeScript strict, ESLint Next, mobile-first 375px
- Copy en français, noms de variables en anglais
- Commits `feat(x):` / `fix(x):` / `docs(x):` en français
- Design system : `docs/design-system.md` est la source de vérité, à mettre à jour dans le même commit qu'un nouveau token

---

## 6. Pointeurs documentaires

| Fichier                            | À quoi ça sert                                              |
| ---------------------------------- | ----------------------------------------------------------- |
| `README.md`                        | Setup, scripts, structure, features                         |
| `CODEX.md`                         | Notes des passes Claude sur les travaux Codex (collab IA)   |
| `docs/architecture.md`             | Architecture technique détaillée                            |
| `docs/design-system.md`            | Tokens, composants, do/don't                                |
| `docs/deployment.md`               | Runbook Vercel + Supabase + Upstash                         |
| `docs/security.md`                 | Politique audit deps + CVE acceptées                        |
| `docs/rgpd.md`                     | Runbook RGPD complet                                        |
| `seo-audit-initial.md`             | Audit SEO de départ (gaps identifiés)                       |
| `seo-implementation-report.md`     | Rapport d'implémentation SEO local Guyane                   |
| `checklists/search-console.md`     | Checklist Search Console (URLs à inspecter, suivi)          |
