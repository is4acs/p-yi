# Péyi — Politique de sécurité des dépendances

> Comment on gère les vulnérabilités (`npm audit`), quelles CVE sont
> actuellement acceptées, et comment elles seront résolues.

Dernier audit : **2026-08-06**.

---

## 1. Politique d'audit

### 1.1 Quand on audit

- **À chaque PR** : le script `preflight` fait tourner
  `npm audit --audit-level=high` (bloque le push si une CVE high ou
  critical est détectée).
- **Une fois par trimestre** : audit complet manuel (`npm audit` +
  `npm outdated` + check des packages deprecated).
- **Sur incident** : si une CVE critique est publiée sur une dep
  directe (alerte GitHub / Dependabot), traitement immédiat.

### 1.2 Critères de blocage

| Sévérité     | Politique                                           |
| ------------ | --------------------------------------------------- |
| `critical`   | **Fail le build**. À fixer avant de merger.         |
| `high`       | Documenté dans ce fichier avec justification + plan. |
| `moderate`   | Évalué au cas par cas (risque réel vs coût fix).     |
| `low` / `info` | Fix en batch au prochain audit trimestriel.        |

Depuis l'audit 2026-08-06 (0 vulnérabilité), le preflight tourne en
`--audit-level=high` : toute nouvelle high bloque le push. Si une high
transitive sans fix apparaît un jour, la documenter ici PUIS l'accepter
temporairement en repassant le seuil à `critical` dans le même commit.

### 1.3 Durcissement possible (pas encore fait)

- **Dependabot** (`.github/dependabot.yml`) : PR automatiques sur les
  MAJ sécurité. À activer quand le projet aura un processus de review.
- **`audit-ci`** avec whitelist de CVE : permettrait de bloquer toutes
  les high sauf celles explicitement acceptées. Overkill pour l'instant
  (la liste ci-dessous tient sur une page).

---

## 2. CVE actuellement acceptées

**Aucune** depuis l'audit 2026-08-06 — `npm audit` retourne
0 vulnérabilité.

### 2.0 Overrides npm en place (à surveiller aux bumps de Next)

Les deux dépendances que Next 15 pinne en version vulnérable sont
forcées via le bloc `overrides` de `package.json` :

| Package | Pinnée par Next | Forcée à | Pourquoi |
| ------- | --------------- | -------- | -------- |
| `postcss` (vendored) | 8.4.31 | ^8.5.26 | 4 advisories (XSS stringify, path traversal sourceMappingURL) — bump mineur compatible |
| `sharp` | 0.34.5 | ^0.35.3 | CVE libvips héritées (CVE-2026-33327/33328/35590/35591) — sharp est utilisé AU RUNTIME par l'optimiseur d'images |

Validation faite au moment de l'override : pipeline sharp identique à
celui de `next/image` (rotate + resize + webp + avif) testé OK, build
complet OK. **Au prochain bump majeur de Next (16+), vérifier si ces
overrides sont devenus inutiles et les retirer.**

### 2.1 Chaîne Next.js — historique

Les 5 CVE précédemment acceptées sur Next.js 14.2.35 ont été résolues
par le **bump vers Next.js 15.5.15** (audit public-ready). `npm audit
--audit-level=high` retourne désormais 0 vulnérabilité.

Migration réalisée :
- `params` et `searchParams` convertis en Promises (codemod officiel
  `@next/codemod next-async-request-api`)
- `cookies()` et `headers()` convertis en fonctions async, avec
  `createSupabaseServerClient()` et `getClientIp()` propagés
- `tsconfig.json` passé à `target: ES2017` (requis par Next 15 pour
  le top-level await)

Versions patchées pour référence (toutes ≥ 15.5.15) :

| CVE | Titre | Sévérité |
| --- | ----- | -------- |
| [GHSA-q4gf-8mx6-v5v3](https://github.com/advisories/GHSA-q4gf-8mx6-v5v3) | DoS with Server Components | high (7.5) |
| [GHSA-h25m-26qc-wcjf](https://github.com/advisories/GHSA-h25m-26qc-wcjf) | HTTP deserialization DoS via RSC | high (7.5) |
| [GHSA-9g9p-9gw9-jx7f](https://github.com/advisories/GHSA-9g9p-9gw9-jx7f) | DoS via Image Optimizer `remotePatterns` | moderate (5.9) |
| [GHSA-ggv3-7p47-pfv8](https://github.com/advisories/GHSA-ggv3-7p47-pfv8) | HTTP request smuggling in `rewrites()` | moderate |
| [GHSA-3x4c-7xq6-9pq8](https://github.com/advisories/GHSA-3x4c-7xq6-9pq8) | `next/image` disk cache unbounded growth | moderate |

### 2.2 Mitigations défensives en place

Indépendamment des CVE, plusieurs couches réduisent l'exposition
générale :

1. **Rate limiting Upstash** (`src/lib/rate-limit.ts`) — sliding window
   sur toutes les server actions (auth, write, report, export).
2. **CSP strict** (`next.config.mjs`) — `frame-ancestors 'none'`,
   `object-src 'none'`, pas de scripts tiers non whitelistés.
3. **Vercel edge** — DDoS/WAF natif devant l'app.
4. **Row Level Security Supabase** (`supabase/rls-setup.sql`) —
   défense en profondeur si la clé `anon` fuitait.

---

## 3. Historique des audits

### 2026-08-06 — passe production-ready

**État avant** :
- 4 vulnérabilités high :
  - `next` 15.5.20 — 5 advisories (cache confusion
    [GHSA-4633-3j49-mh5q](https://github.com/advisories/GHSA-4633-3j49-mh5q),
    Server Action payload non borné en Edge
    [GHSA-4c39-4ccg-62r3](https://github.com/advisories/GHSA-4c39-4ccg-62r3),
    SSRF via rewrites
    [GHSA-p9j2-gv94-2wf4](https://github.com/advisories/GHSA-p9j2-gv94-2wf4),
    DoS image SVG
    [GHSA-q8wf-6r8g-63ch](https://github.com/advisories/GHSA-q8wf-6r8g-63ch),
    disclosure d'endpoints Server Functions
    [GHSA-955p-x3mx-jcvp](https://github.com/advisories/GHSA-955p-x3mx-jcvp)).
  - `postcss` ≤8.5.22 (racine + vendored Next) — sévérité relevée à
    high par les advisories sourceMappingURL
    ([GHSA-6g55-p6wh-862q](https://github.com/advisories/GHSA-6g55-p6wh-862q),
    [GHSA-r28c-9q8g-f849](https://github.com/advisories/GHSA-r28c-9q8g-f849),
    [GHSA-fxqj-rqcc-2cmp](https://github.com/advisories/GHSA-fxqj-rqcc-2cmp)).
  - `sharp` <0.35.0 (dep runtime de Next) — CVE libvips
    ([GHSA-f88m-g3jw-g9cj](https://github.com/advisories/GHSA-f88m-g3jw-g9cj)).

**Actions** :
- ✅ `npm audit fix` — `next` 15.5.20 → **15.5.23** (patch), `postcss`
  racine → 8.5.26.
- ✅ Bloc `overrides` dans `package.json` pour forcer les deps pinnées
  par Next : `postcss` vendored → 8.5.26, `sharp` → 0.35.3 (voir §2.0).
  Le "fix" proposé par `npm audit fix --force` (next@16, breaking) a
  été écarté — l'override couvre les mêmes CVE sans migration majeure.
- ✅ Validation : pipeline sharp (rotate/resize/webp/avif) testé,
  type-check + lint + build + smoke test complet en mode dégradé.
- ✅ Preflight durci : `npm audit --audit-level=high` (avant :
  `critical` seulement) — possible maintenant que la liste des CVE
  acceptées est vide.

**État après** :
- **0 vulnérabilité** (`npm audit` clean).

### 2026-07-20 — audit trimestriel

**État avant** :
- 9 vulnérabilités (2 high, 6 moderate, 1 low) :
  - `next` 15.5.15 — 13 advisories cumulées dont middleware/proxy
    bypass ([GHSA-267c-6grr-h53f](https://github.com/advisories/GHSA-267c-6grr-h53f),
    [GHSA-26hh-7cqf-hhc6](https://github.com/advisories/GHSA-26hh-7cqf-hhc6),
    [GHSA-492v-c6pp-mqqv](https://github.com/advisories/GHSA-492v-c6pp-mqqv)),
    cache poisoning RSC ([GHSA-wfc6-r584-vfw7](https://github.com/advisories/GHSA-wfc6-r584-vfw7),
    [GHSA-vfv6-92ff-j949](https://github.com/advisories/GHSA-vfv6-92ff-j949)),
    XSS CSP nonces ([GHSA-ffhc-5mcf-pf4q](https://github.com/advisories/GHSA-ffhc-5mcf-pf4q)),
    DoS Server Components / Image Optimization. Particulièrement
    pertinent ici : le middleware porte le refresh de session Supabase.
  - `ws` ≤8.20.1 (high, via `web-push`) — memory disclosure + DoS.
  - `js-yaml`, `brace-expansion`, `uuid` (via `svix`/`resend`),
    `esbuild` (via `tsx`) — moderate/low, toutes transitives.

**Actions** :
- ✅ `next` 15.5.15 → **15.5.20** (+ `eslint-config-next` aligné) —
  résout les 13 advisories Next d'un coup, bump patch sans breaking.
- ✅ `npm audit fix` — résout `ws`, `js-yaml`, `brace-expansion`,
  `uuid`/`svix`/`resend`.
- ✅ `tsx` 4.21.0 → 4.23.1 — tire `esbuild` 0.28.1 (patché).
- ✅ Documentation de la CVE postcss vendored par Next (voir §2.0).

**État après** :
- 2 moderate (postcss vendored par Next ×2 entrées npm — acceptée
  et documentée, risque build-time uniquement).

### 2026-04-18 — S26 (initial)

**État avant** :
- 4 vulnérabilités high (glob x3 via eslint-config-next + Next.js x5 CVE)

**Actions** :
- ✅ `eslint-config-next` 14.2.35 → 15.5.15 (fixe la chaîne glob,
  compatible ESLint v8 sans migration flat config).
- ✅ Documentation complète des CVE Next.js restantes avec risque
  réel évalué.
- ✅ Preflight durci : `npm audit --audit-level=critical` bloque
  désormais tout nouveau package critical.

**État après** :
- 1 vulnérabilité high (Next.js — acceptée et documentée, plan S27).

---

## 4. Procédure en cas d'alerte critique

Si GitHub / Dependabot / un utilisateur signale une **CVE critical**
sur une dep Péyi :

1. **Évaluer** — CVSS, range affectée, exploit public ? Applicable
   à notre usage ?
2. **Si exploit actif** : rollback / désactiver la feature concernée
   en prod (flag env, `rateLimit` durci, etc.).
3. **Fixer** dans les 24h ouvrées :
   - Bump de la version (semver-compat si possible, sinon --force).
   - Validation complète : `type-check` + `lint` + `build` + smoke test.
   - Commit dédié `fix(security): …` avec lien vers l'advisory.
4. **Communiquer** aux utilisateurs actifs si leur données sont
   potentiellement compromises (obligation RGPD, voir
   [`docs/rgpd.md`](./rgpd.md)).
5. **Post-mortem** dans ce fichier (section "Historique des audits").

---

## 5. Commandes utiles

```bash
# Audit complet (liste + détails)
npm audit

# Audit JSON (pour scripting)
npm audit --json

# Fix des CVE semver-compat
npm audit fix

# Fix incluant les majors (⚠️ breaking, lire le changelog avant)
npm audit fix --force

# Packages loin de latest
npm outdated

# Détails d'un package
npm view <package> versions --json
npm view <package>@<version> deprecated
```
