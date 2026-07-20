# Péyi — Politique de sécurité des dépendances

> Comment on gère les vulnérabilités (`npm audit`), quelles CVE sont
> actuellement acceptées, et comment elles seront résolues.

Dernier audit : **2026-07-20**.

---

## 1. Politique d'audit

### 1.1 Quand on audit

- **À chaque PR** : le script `preflight` fait tourner
  `npm audit --audit-level=critical` (bloque le push si une CVE critical
  est détectée).
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

On refuse de faire `--audit-level=high` dans le preflight tant que
les CVE Next.js listées ci-dessous ne sont pas résolues (sinon on
se bloque inutilement).

### 1.3 Durcissement possible (pas encore fait)

- **Dependabot** (`.github/dependabot.yml`) : PR automatiques sur les
  MAJ sécurité. À activer quand le projet aura un processus de review.
- **`audit-ci`** avec whitelist de CVE : permettrait de bloquer toutes
  les high sauf celles explicitement acceptées. Overkill pour l'instant
  (la liste ci-dessous tient sur une page).

---

## 2. CVE actuellement acceptées

### 2.0 postcss vendored par Next.js — acceptée (moderate)

| CVE | Titre | Sévérité | Statut |
| --- | ----- | -------- | ------ |
| [GHSA-qx2v-qp2m-jg93](https://github.com/advisories/GHSA-qx2v-qp2m-jg93) | XSS via `</style>` non échappé dans la sortie stringify | moderate | acceptée |

**Contexte** : Next.js embarque sa propre copie de `postcss` (8.4.31,
pinnée par Next — `node_modules/next/node_modules/postcss`). Notre
copie racine est déjà en 8.5.10 (patchée). Le "fix" proposé par
`npm audit fix --force` (downgrade vers next@9) est un faux positif
de résolution.

**Risque réel** : quasi nul. postcss n'est utilisé par Next qu'au
build, sur notre propre CSS (input de confiance). L'advisory concerne
la stringification de CSS non fiable, un scénario qui n'existe pas ici.

**Plan** : disparaîtra au prochain bump de Next qui met à jour sa
dépendance vendored. Re-check à chaque audit trimestriel.

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
