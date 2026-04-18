# Péyi — Politique de sécurité des dépendances

> Comment on gère les vulnérabilités (`npm audit`), quelles CVE sont
> actuellement acceptées, et comment elles seront résolues.

Dernier audit : **2026-04-18** (S26).

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

### 2.1 Chaîne Next.js 14.2.35 — 5 CVE

Toutes résolues par un bump vers Next.js 15.5.x ou 16.x. **Pas faisable
dans une session audit courte** : c'est un major upgrade qui implique
React 19, async params, font loader changes, etc. Tracké comme
chantier dédié **S27 — Upgrade Next.js 15/16**.

Toutes les CVE sont évaluées à **risque résiduel faible** pour Péyi
grâce à notre hébergement Vercel (backport edge des fixes critiques,
Cloudflare devant pour rate limiting et anti-DoS).

| CVE | Titre | Sévérité (CVSS) | Applicable à Péyi ? | Fix dispo |
| --- | ----- | --------------- | ------------------- | --------- |
| [GHSA-q4gf-8mx6-v5v3](https://github.com/advisories/GHSA-q4gf-8mx6-v5v3) | DoS with Server Components | high (7.5) | ⚠️ Oui (on utilise RSC) | 15.5.15+ |
| [GHSA-h25m-26qc-wcjf](https://github.com/advisories/GHSA-h25m-26qc-wcjf) | HTTP deserialization DoS via RSC | high (7.5) | ⚠️ Oui (on utilise RSC) | 15.0.8+ |
| [GHSA-9g9p-9gw9-jx7f](https://github.com/advisories/GHSA-9g9p-9gw9-jx7f) | DoS via Image Optimizer `remotePatterns` | moderate (5.9) | ❌ Non (hosté Vercel, pas self-host) | 15.5.10+ |
| [GHSA-ggv3-7p47-pfv8](https://github.com/advisories/GHSA-ggv3-7p47-pfv8) | HTTP request smuggling in `rewrites()` | moderate | ❌ Non (pas de `rewrites()` dans `next.config.js`) | 15.5.13+ |
| [GHSA-3x4c-7xq6-9pq8](https://github.com/advisories/GHSA-3x4c-7xq6-9pq8) | `next/image` disk cache unbounded growth | moderate | ❌ Non (Vercel gère le cache image) | 15.5.14+ |

### 2.2 Mitigations en place

Même sans upgrade immédiat, plusieurs couches réduisent l'exposition :

1. **Rate limiting Upstash** (`src/lib/rate-limit.ts`) — sliding window
   sur toutes les server actions (auth, write, report, export). Réduit
   l'impact des DoS niveau app.
2. **CSP strict** (`next.config.js`) — `frame-ancestors 'none'`,
   `object-src 'none'`, pas de scripts tiers non whitelistés.
3. **Vercel edge** — DDoS/WAF natif devant l'app, Vercel backporte les
   mitigations des CVE dans leur runtime (non publié mais attendu).

### 2.3 Plan de remédiation

**Session S27 — Upgrade Next.js** (reportée ici pour traçabilité) :

- [ ] Migrer vers Next 15 LTS (si Vercel publie une LTS 15.x) ou
      directement Next 16 latest.
- [ ] Adapter les `params` et `searchParams` en async (breaking
      change Next 15 — ~30 fichiers concernés : toutes les pages
      `[slug]` + pages avec `searchParams`).
- [ ] Migrer vers React 19 (depuis 18.3.1) — surveiller les deprecation
      warnings sur `useRef`, `forwardRef`, `propTypes`, etc.
- [ ] Re-valider le CSP + l'hydratation SSR (Next 15 change la
      stratégie de streaming).
- [ ] Re-build OG images via `next/og` (l'API a changé en 15.3).
- [ ] Cleanup des eslint-disable temporaires ajoutés lors du bump
      `eslint-config-next` 15 → 16.

**Volume estimé** : 15-20 commits atomiques, 1 à 2 jours de travail
avec tests manuels exhaustifs.

---

## 3. Historique des audits

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
