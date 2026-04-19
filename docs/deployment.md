# Déploiement Péyi

Runbook pour déployer Péyi en production. Cible par défaut : **Vercel +
Supabase + Upstash**, tous trois disposent d'un tier gratuit suffisant pour
lancer la bêta.

L'app est 100% Next.js standard — rien n'empêche de la déployer sur
Railway, Fly.io ou un VPS classique avec `next start`. Ce guide reste
spécifique à Vercel parce que c'est le chemin le plus court.

---

## 1. Prérequis (comptes à créer)

| Service      | Rôle                                 | Plan       |
| ------------ | ------------------------------------ | ---------- |
| **Vercel**   | Hébergement Next.js                  | Hobby OK   |
| **Supabase**| Postgres + Auth + Storage             | Free OK    |
| **Upstash** | Redis (rate limiting)                 | Free OK    |
| Domaine      | `peyi.com` ou équivalent (optionnel) | —          |

Clone git du repo disponible (accès restreint — projet propriétaire).

---

## 2. Setup Supabase

### 2.1 Créer le projet

1. <https://supabase.com/dashboard> → **New project**
2. Région : `eu-west-3` (Paris) ou `us-east-1` selon ta latence.
   Cayenne est plus proche de `us-east-1` en pratique.
3. Mot de passe DB : **garde-le** — il servira pour `DATABASE_URL`.

### 2.2 Récupérer les clés

Dans le dashboard Supabase :

- **Settings → API** :
  - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
  - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `service_role` (secret !) → `SUPABASE_SERVICE_ROLE_KEY`

- **Connect → ORMs → Prisma** :
  - Transaction pooler (port 6543) → `DATABASE_URL`
  - Direct connection (port 5432) → `DIRECT_URL`

### 2.3 Configurer Auth

**Settings → Authentication → URL Configuration** :
- Site URL : `https://peyi.com` (ou ton domaine de prod)
- Redirect URLs ajouter :
  - `https://peyi.com/auth/callback`
  - `http://localhost:3000/auth/callback` (pour le dev en local)

**Providers à activer** :
- Email (déjà activé par défaut)
- Phone (OTP) → configurer un provider SMS (Twilio, MessageBird…)
- Google → créer une app OAuth dans la Google Cloud Console, coller
  Client ID + Secret dans Supabase

**Settings → Auth → Email templates** : traduire en français (sinon
les users reçoivent des emails de confirmation en anglais).

### 2.4 Configurer Storage

**Storage → Create bucket** :
- Nom : `listings` — Public
- Nom : `deals` — Public
- Nom : `avatars` — Public

Pour chaque bucket, **Policies** :
- `SELECT` : public (tout le monde peut voir les images)
- `INSERT / UPDATE / DELETE` : `auth.uid() = owner` (ou géré côté app
  via service role, ce qu'on fait)

Le fichier `supabase/storage-setup.sql` contient les buckets + policies
prêts à l'emploi — copie-colle-le dans **SQL Editor** et exécute.

### 2.5 Activer Row Level Security (RLS) sur les tables

**Obligatoire avant ouverture publique.** Même si toutes les lectures
passent aujourd'hui par Prisma (rôle `postgres` qui bypasse RLS), une
fuite future de la clé `anon` laisserait l'API PostgREST exposer tout
le contenu, y compris les brouillons, messages privés et logs admin.

Dans **SQL Editor**, copie-colle et exécute `supabase/rls-setup.sql`.
Il active RLS sur toutes les tables publiques et définit les policies
SELECT (deals/listings publiés, catégories actives, références
publiques). Les tables privées (messages, notifications, reports,
admin_action_logs, affiliate_*) restent en deny-all pour les clés
`anon`/`authenticated`.

Vérification :

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

Toutes les lignes doivent avoir `rowsecurity = true`.

---

## 3. Setup Upstash

1. <https://console.upstash.com> → **Create database**
2. Type : **Redis**
3. Région : la plus proche de ta région Vercel (ex. `us-east-1`)
4. Copie le **REST URL** + **REST Token** (pas le TLS URL)
   → `UPSTASH_REDIS_REST_URL` et `UPSTASH_REDIS_REST_TOKEN`

En free tier tu as 10 000 requêtes/jour, largement suffisant pour
la bêta (~1 req par action sensible utilisateur).

> ⚠️ **Obligatoire en production** : `src/lib/env.ts` refuse de booter
> si `NODE_ENV=production` et qu'une des deux variables Upstash manque.
> Sans rate limit, l'auth est exposée au brute-force, l'écriture au
> spam, et l'export RGPD au DoS. Échappatoire (situations
> exceptionnelles uniquement, ex. build CI sans accès aux secrets) :
> `ALLOW_NO_RATE_LIMIT=1`.

---

## 4. Setup Vercel

### 4.1 Importer le projet

1. <https://vercel.com/new> → Importer le repo Git
2. Framework preset : Next.js (auto-détecté)
3. Root directory : `./`
4. Build command : laisse la valeur par défaut (`next build`)

### 4.2 Variables d'environnement

Dans **Settings → Environment Variables**, ajoute toutes les variables
de `.env.example` sections **REQUIS** et **REQUIS EN PRODUCTION** :

| Variable                          | Scope                   |
| --------------------------------- | ----------------------- |
| `DATABASE_URL`                    | Production + Preview    |
| `DIRECT_URL`                      | Production + Preview    |
| `NEXT_PUBLIC_SUPABASE_URL`        | Production + Preview    |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | Production + Preview    |
| `SUPABASE_SERVICE_ROLE_KEY`       | Production + Preview    |
| `NEXT_PUBLIC_SITE_URL`            | Production uniquement   |
| `UPSTASH_REDIS_REST_URL`          | Production + Preview    |
| `UPSTASH_REDIS_REST_TOKEN`        | Production + Preview    |

⚠️ `NEXT_PUBLIC_SITE_URL` en preview pointerait vers la mauvaise URL —
laisse Vercel fallback automatique via `VERCEL_URL` si tu veux des
preview deployments fonctionnels, ou configure-le par branche.

### 4.3 Domaine

**Settings → Domains** → ajouter `peyi.com` (et `www.peyi.com` en alias
si tu veux). Suivre les instructions DNS.

---

## 5. Migrations Prisma (première fois)

Depuis ta machine, avec `.env.local` configuré sur la **prod** (ou
temporairement) :

```bash
# Applique le schéma en prod
npx prisma migrate deploy

# Seed initial (catégories, communes de Guyane, tags)
npm run db:seed
```

⚠️ `prisma migrate deploy` applique les migrations déjà existantes —
il n'en génère pas de nouvelles. Utilise `prisma migrate dev` en local
pour créer une migration, puis commit-la, puis `deploy` en prod.

**Ne jamais** `db:push` en prod — cette commande synchronise sans
créer de migration, donc tu perds la traçabilité.

### 5.1 Créer ton super-admin

Toujours depuis ta machine avec `.env.local` pointant sur la prod :

```bash
npm run promote-super-admin -- isaac@peyi.com
```

Ce compte aura accès à `/admin` une fois connecté.

---

## 6. Déploiement initial

```bash
git push origin main
```

Vercel build automatiquement. Suis les logs dans le dashboard Vercel.
La première build doit réussir si toutes les env vars sont configurées.

Si le build fail avec un message du genre
`❌ Invalid environment variables: ...`, c'est la validation zod de
`src/lib/env.ts` qui rejette — ajoute la variable manquante et
redéploie.

---

## 7. Pré-lancement public — checklist légale & RGPD

**À valider impérativement avant d'ouvrir le service au grand public
français / DOM-TOM** (LCEN + RGPD). Sans ces éléments, le service
expose son éditeur à des poursuites civiles / pénales et à des
sanctions CNIL.

- [ ] `src/app/mentions-legales/page.tsx` — remplacer **tous** les
      `[À COMPLÉTER]` par les informations réelles de l'éditeur
      (nom/raison sociale, statut, SIREN/SIRET, adresse du siège,
      directeur de publication). Obligation LCEN art. 6-III.
- [ ] `src/app/confidentialite/page.tsx` — faire relire par un DPO ou
      juriste RGPD. La rédaction actuelle est conforme dans les grandes
      lignes (art. 13) mais doit être validée selon la structure
      juridique réelle (base légale "contrat" applicable uniquement si
      l'éditeur est personne morale avec CGU acceptées).
- [ ] `src/app/cgu/page.tsx` — idem : relecture juridique.
- [ ] Contact `contact@peyi.gf` — vérifier que la boîte existe et est
      relevée. L'art. 12 RGPD impose une réponse sous 30 jours.
- [ ] Décision sur un **DPO** : obligatoire si traitement "à grande
      échelle" de données de mineurs ou de santé. Péyi n'entre
      probablement pas dedans au lancement mais à réévaluer.
- [ ] **Registre des traitements** (art. 30 RGPD) — à tenir en interne
      dès qu'il y a plus d'un utilisateur.

---

## 8. Post-deploy — checklist de vérification technique

À faire après le premier déploiement, et idéalement à chaque release
majeure :

- [ ] `https://peyi.com` charge et affiche la home
- [ ] `/connexion` accepte email + Google + OTP téléphone
- [ ] Créer un compte, poster un bon plan → doit apparaître sur la home
- [ ] `/sitemap.xml` répond et contient les deals + listings
- [ ] `/robots.txt` bloque bien `/admin`, `/profil`, `/api`
- [ ] OG image `/bons-plans/[slug]/opengraph-image` se génère
      (tester via <https://www.opengraph.xyz>)
- [ ] `/api/metrics` renvoie 204 (envoi Core Web Vitals OK)
- [ ] `/admin` accessible au super-admin, bloqué pour un user standard
- [ ] PWA installable depuis Safari iOS et Chrome Android
      (icône apparaît après "Ajouter à l'écran d'accueil")
- [ ] Upload d'une image sur un bon plan → visible depuis Supabase
      Storage dashboard
- [ ] Spam 10 connexions en moins d'une minute depuis la même IP →
      bloqué au bout de 5 (rate limit)

---

## 9. Maintenance

### Nouvelle migration Prisma

```bash
# En local
npx prisma migrate dev --name add_something
git add prisma/migrations && git commit -m "feat(db): add something"
git push

# Vercel build déclenche, mais n'applique PAS la migration tout seul.
# Il faut explicitement :
npx prisma migrate deploy
# (depuis ta machine avec .env.local prod, ou via un Vercel cron job)
```

**TODO roadmap** : câbler un script `postbuild` ou un Vercel cron qui
lance `prisma migrate deploy` automatiquement. Aujourd'hui c'est
manuel — acceptable pour la phase bêta, à automatiser avant le scale.

### Rotation des secrets

Tous les secrets (DB password, Supabase service role, Upstash token)
peuvent être régénérés côté provider puis re-collés dans Vercel.
Vercel redéploie automatiquement quand une env var change (ou clique
"Redeploy" manuellement).

### Logs

Vercel Dashboard → **Logs** montre le stdout du serveur. Les lignes
JSON émises par `src/lib/log.ts` sont indexées et filtrables via la
barre de recherche Vercel.

Pour chercher tous les errors Prisma des dernières 24h :
`level:"error" msg:"prisma"`.

### Observability — Log Drain externe (recommandé en prod)

Les logs Vercel sont éphémères (rétention 24 h en plan Hobby, 7 j
en Pro). Pour conserver l'historique, alerter sur les erreurs et
corréler avec les Web Vitals, il faut brancher un **log drain** vers
un collecteur externe. Trois options testées, choisis-en une :

**Option A — Vercel Log Drains natifs** (le plus simple, payant à
partir de 100 € / mois côté provider)

Vercel Dashboard → **Settings → Log Drains** → **Add Log Drain**.
Choisis l'un des intégrations natives :
- **Datadog** : OAuth en 2 clics, ingestion auto, dashboards prêts
- **Better Stack** (ex Logtail) : free tier généreux (1 GB/mois)
- **Axiom** : free tier 0,5 GB/jour, requêtes SQL-like

Format requis : `JSON` (notre logger émet déjà du JSON-ligne, rien
à adapter). Filtre : laisse `All` la première fois, tu affineras
ensuite si tu veux exclure les logs `level:"debug"`.

**Option B — Forward via Webhook** (gratuit, DIY)

Configure un **Custom Webhook** Log Drain qui pointe vers ton propre
endpoint (Cloudflare Worker, Lambda, etc.) qui forwarde où tu veux
(Slack, Discord, S3…). Utile pour alertes en temps réel sans plan
payant.

**Option C — Self-hosted Grafana Loki** (gratuit, plus d'ops)

1. Déploie Loki sur Fly.io ou un VPS (~5 €/mois)
2. Vercel Log Drain → endpoint HTTP Loki (`/loki/api/v1/push`)
3. Branche Grafana en frontal pour les dashboards

### Alertes minimum à mettre en place

Quel que soit l'outil :

- Toute ligne `level:"error"` qui contient `prisma` → notification Slack
- Plus de 10 `client-error` en 5 min → enquête (probable régression UI)
- Plus de 5 `level:"warn"` `rate-limit-hit` en 1 min sur le même IP →
  potentielle attaque, considérer un block Cloudflare

---

## 10. Dépannage

**Build fail avec `Invalid environment variables`** :
→ `src/lib/env.ts` a rejeté la config. Compare avec `.env.example`.

**Login OK mais 404 sur `/profil`** :
→ Le profil Prisma n'a pas été créé. Vérifier la route
`/auth/complete-profile` — c'est là qu'on crée la row `User` après
un OAuth first login.

**Images uploadées mais non visibles** :
→ Vérifier que les buckets Supabase Storage sont bien en mode
**Public**, et que les policies autorisent le `SELECT` anonyme.

**Rate limiting en prod donne 429 sur tout** :
→ `UPSTASH_REDIS_REST_URL/TOKEN` mal configuré. Check les logs Vercel
pour le message `[rate-limit] UPSTASH_... manquant`.

**OG image 500** :
→ Probablement une URL d'image qui fail côté Satori (CORS, format
non supporté). Les catches sont loggés — cherche `opengraph-image`
dans les logs.

---

## 11. Ressources externes

- [Next.js deployment docs](https://nextjs.org/docs/app/building-your-application/deploying)
- [Supabase production checklist](https://supabase.com/docs/guides/platform/going-into-prod)
- [Upstash Ratelimit docs](https://github.com/upstash/ratelimit-js)
- [Prisma migrate deploy](https://www.prisma.io/docs/orm/prisma-migrate/workflows/prod-and-testing)
