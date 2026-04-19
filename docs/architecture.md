# Architecture Péyi

Vue d'ensemble de la stack, des choix structurants et des conventions
internes. Complément technique au README principal.

Public visé : un futur contributeur (ou Isaac dans 6 mois) qui doit
modifier le code sans avoir à tout re-deviner.

---

## 1. Stack et raison du choix

| Couche     | Techno                    | Pourquoi                                            |
| ---------- | ------------------------- | --------------------------------------------------- |
| Framework  | Next.js 15 (App Router)   | RSC natif, file-based routing, bon SSR/ISR          |
| Langage    | TypeScript strict         | Catch au build, contrat clair entre fichiers        |
| Style      | Tailwind + tokens Péyi    | Pas de CSS-in-JS, design cohérent via tokens        |
| UI         | Radix + Lucide + Sonner   | Primitives accessibles sans dépendance lourde       |
| DB         | Postgres (Supabase)       | Relationnel éprouvé + free tier Supabase           |
| ORM        | Prisma 5                  | Typage fort, migrations propres                    |
| Auth       | Supabase Auth             | Email + OTP + OAuth packagés, cookies SSR          |
| Storage    | Supabase Storage          | S3-compatible, colocalisé avec Auth                |
| Rate limit | Upstash Redis             | REST API (edge-compatible), sliding window         |
| Validation | Zod 4                     | Schémas partagés env + inputs + formulaires        |
| Logs       | Console JSON + stdout     | Compatible Vercel, grep-friendly, pas de SDK lourd |

**Non choisi volontairement** :
- Pas de state manager global (Zustand, Redux) — l'état serveur est
  géré par les server components, les quelques états clients sont
  locaux.
- Pas de framework form type react-hook-form — les server actions +
  `<form>` natif suffisent pour nos formulaires simples.
- Pas de Sentry ni Datadog en v1 — `/api/client-errors` + logs
  structurés couvrent le besoin initial. À ajouter si le volume
  explose.

---

## 2. Arborescence `src/`

```
src/
├── app/                    Routes App Router
│   ├── (public)/           Pages publiques (home, bons-plans, annonces)
│   ├── admin/              Back-office (role ADMIN+ requis)
│   ├── api/                Route handlers (metrics, client-errors, export)
│   ├── auth/               Callback OAuth, complete-profile
│   ├── connexion/          Sign-in (email, OTP, OAuth)
│   ├── profil/             Espace connecté (mes annonces, favoris, RGPD)
│   ├── messages/           Messagerie (thread par conversation)
│   ├── poster/             Création de bon plan
│   ├── layout.tsx          Root layout (providers, metadata, PWA)
│   ├── error.tsx           Error boundary (RSC crash)
│   ├── global-error.tsx    Fallback quand layout lui-même crash
│   ├── not-found.tsx       404 global
│   ├── opengraph-image.tsx OG racine (next/og)
│   ├── sitemap.ts          Sitemap dynamique
│   └── robots.ts           Robots.txt
├── components/
│   ├── ui/                 Primitives DS (Button, Input, Badge…)
│   ├── deals/, listings/   Composants métier par domaine
│   ├── analytics/          WebVitals reporter
│   └── layout/             Header, Footer, BottomNav
├── lib/
│   ├── env.ts              Validation zod des env vars (fail-fast)
│   ├── prisma.ts           Client Prisma singleton
│   ├── log.ts              Logger structuré JSON
│   ├── rate-limit.ts       4 limiters Upstash (auth/write/report/export)
│   ├── site-url.ts         Helper URL canonique
│   ├── auth/               current-user, requireUser, rôles
│   ├── supabase/           Clients (server, client, admin, middleware)
│   ├── seo/                Builders JSON-LD + canonical helpers
│   ├── deals/, listings/   Queries Prisma + helpers métier
│   └── storage/            Wrappers Supabase Storage
├── middleware.ts           Refresh session Supabase à chaque request
└── config/
    └── site.ts             Constantes site (nom, URL, socials)
```

**Règle** : tout ce qui est appelé depuis plusieurs routes vit dans
`lib/`. Tout ce qui est spécifique à une route vit à côté du fichier
de route (dans `app/`). Les composants UI partagés vont dans
`components/ui/`.

---

## 3. Cycle d'une request

```
Browser
  └─▶ middleware.ts
         └─▶ updateSession() : refresh cookie Supabase si expirant
               └─▶ NextResponse
Browser
  └─▶ Route (RSC par défaut)
         └─▶ getCurrentUser() / requireUser() / requireRole()
                └─▶ Prisma query (via client singleton)
                └─▶ renvoie RSC serialisé (HTML + RSC payload)
Browser (mutations)
  └─▶ <form action={serverAction}>
         └─▶ server action
                ├─▶ requireActiveUser() (check ban)
                ├─▶ rate limiter (writeLimiter ou autre)
                ├─▶ zod parse(input)
                ├─▶ prisma.write
                └─▶ revalidatePath / redirect
```

### Points importants

**Session Supabase** — le `middleware.ts` tourne sur **toutes** les
routes non statiques (matcher exclut `_next/static`, images, fonts).
Il appelle `supabase.auth.getUser()` qui rafraîchit les cookies JWT si
besoin. Sans lui, les tokens expirent et l'utilisateur est silencieusement
déconnecté.

**Pas de fetch client → API Routes** — l'app privilégie les server
actions et les RSC. Les routes `/api/*` ne sont utilisées que pour
3 cas : métriques Web Vitals (beacon navigator), erreurs client (POST
fire-and-forget), export RGPD (download de JSON).

**Revalidation** — on utilise `revalidatePath` dans les server actions,
pas `revalidateTag`. Plus simple à raisonner : tu sais exactement
quelle URL est invalidée.

---

## 4. Authentification

### 4.1 Supabase Auth

3 providers :
- **Email + password** (classique)
- **Phone OTP** (Twilio via Supabase, SMS code 6 chiffres)
- **Google OAuth**

La session est un JWT stocké en cookie `httpOnly`. Le middleware le
refresh à chaque request.

### 4.2 Deux sources de vérité

Supabase gère `auth.users` (email, phone, password hash). On a **en
plus** notre propre table `User` en Prisma (`prisma/schema.prisma`)
qui stocke username, bio, avatar, karma, role, etc.

**Règle** : `User.id` = `auth.users.id`. Ils sont liés 1-1.

**Trigger naturel** : à la première connexion OAuth, `auth.users` existe
mais pas notre `User`. `requireUser()` redirige alors vers
`/auth/complete-profile` qui force l'utilisateur à choisir un username
avant d'aller plus loin.

### 4.3 Helpers

Dans `src/lib/auth/current-user.ts` :
- `getCurrentUser()` — renvoie User ou null (pas de redirect)
- `requireUser()` — redirect `/connexion` si non auth
- `requireActiveUser()` — idem + redirect `/banni` si banni
- `requireRole(role)` — idem + redirect `/` si rôle insuffisant

### 4.4 Hiérarchie de rôles

```
USER / PRO / AMBASSADOR  →  rank 0
MODERATOR                →  rank 10
ADMIN                    →  rank 20
SUPER_ADMIN              →  rank 30
```

`PRO` et `AMBASSADOR` sont orthogonaux à la hiérarchie de modération —
un pro n'a pas plus de droits admin qu'un user standard. On utilise
`hasRole(user, minRole)` et `requireRole(minRole)`.

**Un ban annule tous les privilèges** : `hasRole(bannedAdmin, ADMIN)`
renvoie `false`.

---

## 5. Rate limiting

`src/lib/rate-limit.ts` expose 4 limiters :

| Limiter         | Clé     | Budget          | Usage                                  |
| --------------- | ------- | --------------- | -------------------------------------- |
| `authLimiter`   | IP      | 5 / 10 min      | signIn, signUp, OAuth, OTP             |
| `writeLimiter`  | userId  | 10 / min        | créer annonce, bon plan, commentaire   |
| `reportLimiter` | userId  | 5 / heure       | signaler un contenu (S21)              |
| `exportLimiter` | userId  | 1 / 24 h        | export RGPD (coûteux, lit ~10 tables)  |

Algorithme : **sliding window** (lissé, pas de burst au changement de
minute). Backend : **Upstash Redis REST** (edge-compatible, pas besoin
de connexion TCP persistante).

**Fallback no-op** : si `UPSTASH_REDIS_REST_URL/TOKEN` manque (dev
local), tous les limiters sont remplacés par une stub qui autorise
tout et warn une seule fois. Voir `makeLimiter()` dans `rate-limit.ts`.

**Récup IP client** : `getClientIp()` lit `x-forwarded-for` puis
`x-real-ip` puis `cf-connecting-ip`, fallback `"unknown"`. Vercel et
Cloudflare remplissent correctement.

---

## 6. Validation (zod)

Trois endroits :

1. **Env vars** — `src/lib/env.ts` parse `process.env` au démarrage.
   Schemas séparés server/public. **Fail-fast** : si une var manque,
   l'app ne boot pas et affiche la liste des problèmes.

2. **Inputs server actions** — chaque action a un schema local zod
   qui parse `FormData`. Si le parse fail, l'action renvoie une erreur
   structurée (état React-compatible via `useFormState`).

3. **Paramètres d'URL** — `src/lib/deals/filters.ts` etc. parsent les
   `searchParams` avec zod pour valider les filtres (prix min/max,
   catégorie, tri…).

---

## 7. Observability

### 7.1 Logger JSON-ligne (`src/lib/log.ts`)

```ts
logger.info("user.signup", { userId, method: "google" });
logger.error("prisma.error", err);
```

Produit du JSON sur stdout, ingéré par Vercel Logs. Niveau contrôlé
par `LOG_LEVEL` (par défaut `info` en prod, `debug` en dev).

### 7.2 Core Web Vitals

`src/components/analytics/WebVitals.tsx` est un client component monté
dans le root layout. Il écoute `useReportWebVitals` de Next et envoie
chaque métrique (LCP, INP, CLS, FCP, TTFB, FID) via `navigator.sendBeacon`
vers `/api/metrics`, qui log la ligne.

En dev on `console.log` au lieu d'envoyer — ça évite d'inonder la
route handler pendant les hot reloads.

### 7.3 Client errors

`src/app/error.tsx` (error boundary RSC) POST vers `/api/client-errors`
avec `{ digest, message, stack, url }`. La route log via le logger
structuré. Fire-and-forget, pas de retry — on accepte de perdre
quelques crashes pour ne pas alourdir le client.

Permet un grep rapide dans Vercel Logs : `msg:"client-error"`.

---

## 8. SEO

- **Sitemap** (`src/app/sitemap.ts`) — liste dynamique des deals non
  expirés + listings publiés + catégories + villes
- **Robots.txt** (`src/app/robots.ts`) — exclut `/admin`, `/profil`,
  `/api`, `/messages`
- **JSON-LD** (`src/lib/seo/jsonld.ts`) — Organization + WebSite au
  root, Product+Offer sur chaque deal/listing, BreadcrumbList
- **OG images** — `opengraph-image.tsx` au root (statique) + un par
  slug de deal/listing (dynamique via `next/og` / Satori)
- **Canonicals** — `buildCanonicalPath` dans `src/lib/seo/canonical.ts`.
  Garde category + city dans l'URL canonique (facettes permanentes),
  strip sort/page/q (vues du même contenu). Les pages de recherche
  avec query sont `noindex`.

---

## 9. PWA

- **Manifest** : `public/manifest.webmanifest` (standalone, thème
  orange Péyi, icônes maskable)
- **Service Worker** : `public/sw.js` — cache-first pour les assets,
  network-first pour les pages. Pas de background sync, pas de push
  (sur la roadmap via OneSignal)
- **Registration** : dans le root layout, `<Script>` qui register
  `sw.js` côté client si `navigator.serviceWorker` existe.

---

## 10. Conventions de code

### Imports

```ts
// 1. libs externes
import { useState } from "react";
import { z } from "zod";

// 2. @/lib
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/current-user";

// 3. @/components
import { Button } from "@/components/ui/button";
```

Séparés par des lignes vides. Les imports type-only sont groupés avec
les imports normaux, pas séparés.

### Nommage

- **Fichiers** : kebab-case (`deal-card.tsx`, `current-user.ts`)
- **Composants React** : PascalCase (`DealCard`)
- **Helpers / variables** : camelCase
- **Constantes exportées** : UPPER_SNAKE (`ROLE_RANK`, `DEFAULT_LIMIT`)

### Commentaires

- En **français** pour les longs commentaires explicatifs (comme ce
  doc)
- En **anglais** pour les JSDoc courts sur fonctions utilitaires
- On explique le **pourquoi**, pas le **quoi** — le code lit le quoi

### Tailwind

- **Mobile-first**, breakpoint `sm` (640px) pour desktop
- Design à **375px minimum** (iPhone SE)
- Tokens custom : `peyi-orange-*`, `peyi-green-*` (voir
  `tailwind.config.ts`)
- Pas de CSS-in-JS — si une animation est complexe, utiliser
  `tailwindcss-animate` ou une `@keyframes` dans `globals.css`

### Commits

Format conventionnel :
- `feat(scope): description`
- `fix(scope): description`
- `docs(scope): description`
- `refactor(scope): description`
- `chore(scope): description`

Scopes fréquents : `auth`, `deals`, `listings`, `admin`, `seo`, `db`,
`ui`, `config`, `readme`…

Tous les commits co-signés `Co-Authored-By: Claude Opus 4.7`.

---

## 11. Décisions architecturales documentées

### Pourquoi Supabase plutôt qu'Auth0 / Clerk ?

Supabase bundle Postgres + Auth + Storage pour gratuit. Clerk est plus
cher au-delà du free tier, Auth0 est overkill pour un MVP. On garde
la possibilité de migrer plus tard (Auth séparé de la DB à 100% —
la table `User` Prisma n'a qu'un FK sur `auth.users.id`).

### Pourquoi Prisma plutôt que Drizzle ?

Typage plus mature en avril 2026, meilleur support des migrations,
community plus large. Drizzle a ses qualités (edge, raw SQL) mais
Péyi n'a pas de contrainte edge sur les queries DB.

### Pourquoi pas React Query / SWR ?

Le state serveur est géré par les RSC et `revalidatePath`. On n'a pas
besoin de cache client pour des queries — si on en avait besoin, on
ajouterait React Query, mais en avril 2026 toutes les lectures passent
par RSC.

### Pourquoi Upstash plutôt qu'un Redis self-hosted ?

Upstash expose une REST API qui marche depuis l'edge runtime. Un Redis
classique (ioredis) nécessite une connexion TCP persistante, incompatible
avec Vercel Edge. Pour du rate limiting on veut l'edge.

### Pourquoi pas Sentry ?

En v1 bêta, les 2-3 utilisateurs quotidiens génèrent ~0 erreur / jour.
Sentry = coût SaaS + SDK ajouté au bundle client. On log via
`/api/client-errors` pour l'instant, on migrera vers Sentry quand
le volume justifie le coût.

---

## 12. Roadmap technique (non implémenté)

- **Push notifications** → OneSignal (env vars déjà réservées)
- **Emails transactionnels** → Resend (env vars réservées)
- **Recherche avancée** → Meilisearch ou Typesense (env vars réservées)
- **Stockage images CDN** → Cloudflare R2 en alternative à Supabase
  Storage (env vars réservées)
- **Affiliation** → Amazon Partners + Awin (env vars réservées)
- **Jobs cron** → Vercel Cron pour expirer les bons plans, rappels
  de messagerie inactifs, etc. (`CRON_SECRET` env var réservée)
- **Monitoring erreurs** → Sentry quand le volume justifie
- **A/B testing** → pas prévu avant 10k MAU
