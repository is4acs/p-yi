# Péyi

> Bons plans et petites annonces 100% Guyane.

Péyi est une PWA communautaire qui rassemble les meilleures promos,
les petites annonces locales et les commerces de Guyane française.
Partage, vote, profite — tout ça près de chez toi.

---

## Stack

| Couche       | Techno                                              |
| ------------ | --------------------------------------------------- |
| Frontend     | Next.js 15 (App Router, RSC), React 18, TypeScript  |
| Styling      | Tailwind CSS + [design system Péyi v1.0](./docs/design-system.md) (tokens orange/vert + Nunito) |
| UI           | Radix UI (dialogs, labels), icônes Péyi + Lucide, Sonner |
| Backend      | Next.js server actions + API routes                 |
| Base de données | PostgreSQL (Supabase) + Prisma 5                 |
| Auth         | Supabase Auth (email + OTP phone + Google OAuth)    |
| Storage      | Supabase Storage (images listings + deals)          |
| Rate limit   | Upstash Redis (sliding window)                      |
| Validation   | Zod (env + inputs server actions)                   |
| Observability | Logger JSON stdout + Core Web Vitals reporter      |
| SEO          | Sitemap + robots.txt + JSON-LD + OG images dynamiques |
| PWA          | Service Worker natif + manifest.webmanifest         |

---

## Prérequis

- **Node.js 20+** (le `postinstall` script a besoin de Prisma)
- **npm** (les scripts supposent npm — si tu préfères pnpm/yarn/bun,
  adapte les commandes)
- Un projet **Supabase** (gratuit — fournit Postgres + Auth + Storage)
- (Optionnel en dev, requis en prod) Un compte **Upstash Redis**
  pour le rate limiting

---

## Installation

```bash
# 1. Clone
git clone <ce-repo> peyi
cd peyi

# 2. Installe les dépendances (déclenche `prisma generate`)
npm install

# 3. Configure l'environnement
cp .env.example .env.local
# Édite .env.local avec tes vraies clés Supabase + URL du site
# Voir la section "Variables d'environnement" ci-dessous

# 4. Pousse le schéma en DB (première fois)
npm run db:push

# 5. Seed (catégories, communes de Guyane, etc.)
npm run db:seed

# 6. Lance le dev server
npm run dev
```

Ouvre <http://localhost:3000> — l'app est dispo, hot reload activé.

### Variables d'environnement

Tout est documenté dans `.env.example`. Résumé des **requises** :

| Variable                           | Source                                |
| ---------------------------------- | ------------------------------------- |
| `DATABASE_URL`                     | Supabase → Connect → Prisma (6543)    |
| `DIRECT_URL`                       | Supabase → Connect → Prisma (5432)    |
| `NEXT_PUBLIC_SUPABASE_URL`         | Supabase → Settings → API             |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`    | Supabase → Settings → API             |
| `SUPABASE_SERVICE_ROLE_KEY`        | Supabase → Settings → API (server)    |
| `NEXT_PUBLIC_SITE_URL`             | URL canonique de l'app (sans slash)   |

Et **recommandées en prod** :

| Variable                      | Source                          |
| ----------------------------- | ------------------------------- |
| `UPSTASH_REDIS_REST_URL`      | Upstash Console → REST URL      |
| `UPSTASH_REDIS_REST_TOKEN`    | Upstash Console → REST Token    |

Sans Upstash, les rate limiters tombent en no-op. C'est acceptable
en dev, **dangereux en prod** (spam auth, abuse signalements).

Le fichier `src/lib/env.ts` valide ces variables au démarrage via
zod — une variable manquante / mal formatée **fait fail-fast** avec
un message listant tous les problèmes d'un coup.

---

## Scripts

```bash
npm run dev              # Dev server (http://localhost:3000)
npm run build            # Build de production
npm run start            # Start du build (après build)
npm run lint             # ESLint + règles Next
npm run type-check       # tsc --noEmit (pas de build, juste la vérif)
npm run audit:ci         # npm audit (fail si CVE critical)
npm run preflight        # type-check + lint + build + audit (check avant push)
npm run favicon:generate # Regénère src/app/favicon.ico depuis SVG inline

npm run db:push          # Push du schéma Prisma vers la DB (dev)
npm run db:migrate       # Nouvelle migration (dev)
npm run db:seed          # Seed de prod (catégories, communes)
npm run db:seed-dev      # Seed dev (deals + listings fake pour tester)
npm run db:studio        # Prisma Studio (admin DB visuel)
npm run db:reset         # Reset complet de la DB (destructive, dev only)

npm run promote-super-admin  # Donner le rôle SUPER_ADMIN à un user
npm run delete-user      # Supprimer un compte (RGPD CLI miroir)
```

---

## Structure du projet

```
src/
├── app/                    # Routes Next (App Router)
│   ├── (public)/           # Routes publiques (implicites, pas de groupe)
│   ├── admin/              # Back-office modération (rôle ADMIN+)
│   ├── api/                # Route handlers (metrics, export, etc.)
│   ├── profil/             # Espace utilisateur connecté
│   ├── poster/             # Création de bons plans
│   ├── annonces/, bons-plans/  # Listings + détails par slug
│   ├── sitemap.ts          # Sitemap dynamique (Next file convention)
│   ├── robots.ts           # Robots.txt
│   ├── opengraph-image.tsx # OG image racine (générée via next/og)
│   ├── error.tsx           # Error boundary global
│   └── global-error.tsx    # Fallback ultime (root layout crash)
├── components/
│   ├── ui/                 # Primitives design system (Button, Input…)
│   ├── deals/, listings/   # Composants métier
│   ├── analytics/          # WebVitals reporter
│   └── layout/             # Header, Footer, BottomNav
├── lib/
│   ├── env.ts              # Validation zod des env vars (fail-fast)
│   ├── prisma.ts           # Client Prisma singleton
│   ├── log.ts              # Logger structuré JSON-ligne
│   ├── rate-limit.ts       # Limiters Upstash (auth, write, report, export)
│   ├── auth/               # getCurrentUser, requireUser, rôles
│   ├── supabase/           # Clients (server, client, admin, middleware)
│   ├── seo/                # JSON-LD + canonical helpers
│   ├── deals/, listings/   # Queries Prisma + helpers métier
│   └── storage/            # Wrappers Supabase Storage (images)
├── middleware.ts           # Refresh session Supabase à chaque request
└── config/site.ts          # Constantes site (nom, URL, socials…)

prisma/
├── schema.prisma           # Source de vérité du modèle de données
└── seed.ts, seed-dev.ts    # Scripts de seed (prod + dev)

scripts/
├── promote-super-admin.ts  # Donne SUPER_ADMIN à un user
└── delete-user.ts          # Suppression RGPD (miroir de l'action UI)

docs/
├── design-system.md        # Référence design system (palettes, composants, do/don't)
├── architecture.md         # Architecture technique
├── deployment.md           # Runbook déploiement (Vercel, Supabase, Upstash)
├── security.md             # Politique audit deps + CVE acceptées + plan upgrade
└── rgpd.md                 # Runbook RGPD (droits, procédures, DPO)
```

---

## Features principales

### Côté utilisateur
- **Bons plans** : partage, vote (hot/new/top), expiration, coverage multi-images
- **Petites annonces** : achat/vente/don/location, filtres avancés
  (prix, km, surface, carburant, etc.)
- **Messagerie** : thread par conversation, attaché à un listing
- **Favoris** sur deals et listings
- **Profils** : niveaux (karma + XP), avatar, bio, édition
- **Signalements** (S21) sur annonces, deals, commentaires
- **PWA installable** (iOS + Android) avec icône custom

### Modération et admin
- Rôles hiérarchiques : USER < MODERATOR < ADMIN < SUPER_ADMIN
- Dashboard admin : utilisateurs, signalements, logs, bans temporaires /
  permanents, rétrogradation de rôles, suppression de contenus
- Audit trail polymorphique (targetType + targetId)

### RGPD
- Hub `/profil/confidentialite` (export, anonymisation, suppression)
- Export JSON complet (portabilité)
- Suppression de compte avec anonymisation des contenus conservés
- Voir [`docs/rgpd.md`](./docs/rgpd.md) pour le runbook complet

### SEO
- Sitemap dynamique (deals non expirés, listings publiés, catégories, villes)
- Robots.txt qui exclut les zones privées
- JSON-LD schema.org : Organization, WebSite, Product+Offer, BreadcrumbList
- OG images dynamiques (next/og) avec prix + cover + branding
- Canonical URLs sur toutes les pages publiques
- `metadataBase` configuré au root

### Observability
- Structured logger JSON-ligne (`src/lib/log.ts`)
- Core Web Vitals reporter → `/api/metrics` via sendBeacon
- Client error boundary → `/api/client-errors` (logs serveur)

---

## Déploiement

Voir [`docs/deployment.md`](./docs/deployment.md) pour le runbook complet
(checklist env vars, migrations, setup Supabase, Upstash, Vercel).

---

## Sécurité, modération, RGPD

- Toutes les server actions sont protégées par rate limiting via Upstash.
- Les rôles sont vérifiés côté serveur (jamais de confiance client).
- Les utilisateurs bannis voient une bannière permanente + redirect
  sur les routes d'écriture.
- La suppression de compte anonymise les commentaires qui ont des
  réponses (pour ne pas casser l'arbre de discussion) et supprime
  tout le reste.
- Le service role Supabase n'est utilisé que côté serveur, jamais
  exposé au client.

Pour les procédures RGPD manuelles (droit d'accès, rectification,
opposition, etc.), voir [`docs/rgpd.md`](./docs/rgpd.md).

---

## Conventions de code

- **TypeScript strict** activé (`strict: true`)
- **ESLint** avec config Next
- **Imports triés** : libs externes → imports @/lib → imports @/components
- **Mobile-first** : design à 375px minimum, breakpoint `sm` (640px)
  pour le desktop
- **Copy en français** partout (UI + commentaires longs). Les noms
  de variables restent en anglais par convention.
- **Commits atomiques** avec messages descriptifs en français
  (`feat(x):`, `fix(x):`, `docs(x):`…).
- **Design system** : tout ce qui touche au style (couleurs, typo,
  composants UI, icônes) suit [`docs/design-system.md`](./docs/design-system.md).
  Nouvelle variante ou nouveau token ⇒ mettre la doc à jour dans le
  même commit.

---

## Contribution

Projet personnel d'Isaac Settou, fondateur de Péyi (École 42).
Les contributions ne sont pas ouvertes pour le moment — le code
vit ici pour documentation et review.

---

## Licence

Tous droits réservés — code propriétaire. L'affichage public de ce
dépôt ne constitue pas une licence d'usage.
