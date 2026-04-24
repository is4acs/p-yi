# Audit complet - Stabilité applicative (24/04/2026)

## Contexte analysé

- Logs Vercel de build sur la branche `codex/seo-local-guyane-architecture`.
- Erreurs runtime répétées côté pages annonces/bons plans.
- Symptômes:
  - écran "Quelque chose s'est mal passé" en navigation,
  - erreurs de rendu Server Components,
  - timeouts Prisma (`P2024`) pendant génération sitemap.

## Points critiques identifiés

### 1) Saturation pool DB pendant génération des sitemaps
- **Symptôme:** `P2024 Timed out fetching a new connection from the connection pool`.
- **Cause:** plusieurs routes sitemap exécutées au build + requêtes Prisma simultanées lourdes dans `getStaticPagesEntries`.
- **Impact:** échec build Vercel (`/sitemap-pages.xml`), puis indisponibilités intermittentes.

### 2) Bruit d'erreur layout pendant rendu statique
- **Symptôme:** log `[layout] current user load failed` avec digest `DYNAMIC_SERVER_USAGE`.
- **Cause:** `getCurrentUser()` (cookies) appelé dans le layout pendant des chemins statiques (ex: `/_not-found`).
- **Impact:** bruit de logs, diagnostic confus; pas toujours fatal mais masque les vraies erreurs.

### 3) Home non tolérante aux pannes partielles DB
- **Symptôme:** page d'erreur globale si une requête home échoue.
- **Cause:** `Promise.all(...)` strict sur deals/listings/user sans fallback.
- **Impact:** un timeout isolé peut casser tout l'accueil.

## Correctifs appliqués

### A. Sitemaps rendus dynamiques et résilients
- Ajout de `export const dynamic = "force-dynamic"` sur:
  - `src/app/sitemap.xml/route.ts`
  - `src/app/sitemap-pages.xml/route.ts`
  - `src/app/sitemap-deals.xml/route.ts`
  - `src/app/sitemap-annonces.xml/route.ts`
  - `src/app/sitemap-images.xml/route.ts`
- Durcissement `src/lib/seo/sitemap.ts`:
  - helper `runSitemapQuery(...)` (timeout + fallback sans throw),
  - exécution des requêtes critiques en série au lieu du `Promise.all` massif,
  - fallback vide/0/null par requête pour ne jamais faire tomber la route.

### B. Layout plus propre en build statique
- `src/app/layout.tsx`:
  - filtrage du digest `DYNAMIC_SERVER_USAGE` pour ne pas logguer une erreur attendue en SSG,
  - conservation du fallback `user = null`.

### C. Home tolérante aux erreurs transitoires
- `src/app/page.tsx`:
  - passage en `Promise.allSettled(...)` pour deals/listings/user,
  - fallback des payloads (`[]`, `null`) si une branche échoue,
  - chargement social state (votes/favoris) encapsulé en `try/catch`.

## Risques résiduels et recommandations

1. Le pool DB Supabase est configuré avec `connection limit: 3` (très serré).
2. Pour stabiliser définitivement en charge:
   - augmenter la limite pool côté Supabase,
   - conserver les garde-fous de timeout applicatifs,
   - surveiller les endpoints sitemap et pages marketplace via logs + uptime checks.

## Checklist de validation après déploiement

1. Build Vercel passe sans erreur `P2024`.
2. `https://www.peyi.gf/sitemap-pages.xml` répond en XML valide.
3. `https://www.peyi.gf/sitemap-deals.xml` répond même si DB lente (au pire partiel, pas 500).
4. Home `/` affiche les sections même en panne partielle DB (pas d'écran global erreur).
5. Navigation `/bons-plans` et `/annonces` ne retombe plus sur la page d'erreur générique lors de timeouts transitoires.

