# Ingest — remplissage des bons plans Péyi

CLI local qui scrape des bons plans **Guyane en magasin** depuis
plusieurs sources, les déduplique, les classe (catégorie/ville/store/
marchand), les attribue à un des 12 personas (`scripts/ingest/
personas.ts`), leur ajoute un engagement simulé cohérent (votes,
commentaires, température, vues), et les écrit en DB via Prisma.

Tout tourne en local — aucune route API, aucun cron Vercel. Tu lances
quand tu veux, tu inspectes avant de committer en base, tu re-lances
sans dupliquer (dedupe par fingerprint + externalUrl).

## Règle métier : Guyane + en magasin

Tout candidat est filtré par `isLocalInStore()` avant write. Un deal est
**accepté** si :
- il a un `storeSlug` correspondant à un magasin Guyane (cf. `prisma/seed.ts`),
- OU il a un `citySlug` Guyane ET le texte contient un signal physique
  (`rayon`, `en magasin`, `sur place`, `dépôt`, `concession`…) sans
  signal online fort.

Un deal est **rejeté** si :
- son `externalUrl` pointe vers un marchand online-only (amazon.fr,
  cdiscount.com, booking.com, aliexpress…),
- OU le texte contient uniquement des signaux online (livraison,
  expédié, sur le site, frais de port…) sans mention physique,
- OU ni ville ni store Guyane détectés.

## Commandes

```bash
# Preview sans toucher à la DB
npm run ingest:dry

# Seulement le fichier manuel data/local-deals.json
npm run ingest:local

# Backfill initial : étale les publishedAt sur 45j
npm run ingest:backfill

# Full run (toutes sources, écriture)
npm run ingest

# Options
npm run ingest -- --source blada-rss --limit 30
```

## Sources incluses

| Nom                 | URL / source                                | Config                               |
| ------------------- | ------------------------------------------- | ------------------------------------ |
| `local-file`        | `data/local-deals.json`                     | édite le JSON                        |
| `blada-rss`         | `https://www.blada.com/feed/`               | env `PEYI_INGEST_BLADA_RSS`          |
| `franceguyane-rss`  | `https://www.franceguyane.fr/rss.xml`       | env `PEYI_INGEST_FRANCEGUYANE_RSS`   |
| `retailer-html`     | sites de magasins Guyane (Carrefour, U, …)  | `data/retailers.json`                |
| `fb-graph`          | Pages Facebook publiques via Graph API v19  | env `PEYI_FB_ACCESS_TOKEN` + `PEYI_FB_PAGE_IDS` |

Les flux RSS peuvent changer d'URL (WordPress permet `?feed=rss2`,
`/feed/`, `/rss.xml`). Si un fetch renvoie 404, ajuste l'env.

### Facebook (fb-graph)

Scraper HTML direct de Facebook = interdit par les ToS et bloqué par
l'anti-bot. La voie propre passe par **Graph API v19** avec un *Page
Access Token* (PAT).

Pour **une page que tu administres** :
1. Crée une app sur https://developers.facebook.com
2. Récupère un Page Access Token long-lived (docs Graph API, section
   "Long-Lived Page Tokens")
3. `export PEYI_FB_ACCESS_TOKEN=EAA...`
4. `export PEYI_FB_PAGE_IDS=123456,789012` (IDs numériques, pas noms)
5. `npm run ingest -- --source fb-graph`

Pour **une page tierce** (ex: Carrefour Guyane officiel) : il faut que
le community manager de la page te génère un token via son app, OU que
ton app soit approuvée par Meta pour le scope `pages_read_engagement`.
Sans ça, tu auras du 400 error. Alternative : copier-coller manuel dans
`data/local-deals.json`.

Les posts FB sont du texte libre → le pipeline applique `normalizeRawItem`
(extraction prix + classify + filtre Guyane in-store). Un post sans
prix ou sans mention Guyane est silencieusement rejeté.

### Sites de magasins (retailer-html)

`data/retailers.json` liste les sites à scraper avec leurs regex. Un
exemple pour Carrefour Guyane est inclus — **les sélecteurs doivent
être vérifiés sur le site réel** car la structure HTML varie et peut
changer.

Format d'une entrée :

```jsonc
{
  "name": "Carrefour Guyane — Promos",
  "pageUrl": "https://www.carrefour-guyane.com/bons-plans",
  "defaultCitySlug": "matoury",
  "defaultStoreSlug": "carrefour-matoury",
  "itemRegex": "<article class=\"product\">([\\s\\S]*?)</article>",
  "titleRegex": "<h2[^>]*>([^<]+)</h2>",
  "priceRegex": "(\\d+[.,]\\d{2})\\s*€",
  "originalPriceRegex": "<del[^>]*>\\s*(\\d+[.,]\\d{2})\\s*€"  // optionnel
}
```

Workflow de calibrage d'un nouveau retailer :
1. `curl -s "$URL" > /tmp/page.html` et inspecte la structure.
2. Identifie le conteneur répété (produit/promo) → `itemRegex`.
3. Dans ce conteneur, trouve le titre, le prix, éventuellement le prix
   barré → les 3 autres regex.
4. Ajoute dans `data/retailers.json`, lance `npm run ingest:dry --
   --source retailer-html` et vérifie les candidats extraits.

Si un site utilise massivement JavaScript pour rendre ses promos, regex
+ fetch ne suffiront pas → il faut passer à Playwright (pas fourni
ici).

## Ajouter une source

1. Crée `scripts/ingest/sources/ma-source.ts` qui implémente `Source`
   (voir `blada-rss.ts` comme template).
2. Ajoute-la dans `allSources()` dans `scripts/ingest/index.ts`.
3. Si ta source a des keywords/catégories spécifiques, étends
   `scripts/ingest/lib/classify.ts`.

## Enrichir `data/local-deals.json`

Le fichier accepte un simple tableau d'objets. Les seuls champs requis
sont `title`, `price`, `categorySlug`. Les slugs valides :

- **Catégories** : `supermarche-alimentation`, `tech-multimedia`,
  `mode-beaute`, `maison-electromenager`, `auto-moto-deals`,
  `voyages-vols`, `restos-sorties`, `enfants-bebe`, `sport-loisirs`,
  `bricolage-jardin`, `arrivages-conteneurs`, `gratuit-echantillons`.
- **Villes** : voir `prisma/seed.ts` (22 communes).
- **Stores & merchants** : voir `prisma/seed.ts`.

Le `citySlug` / `storeSlug` / `merchantSlug` sont déduits
automatiquement du titre si tu ne les précises pas.

## Relancer sans doublons

La dédup est à deux niveaux :
1. **Batch** : fingerprint SHA1 sur `normalize(title) | normalize(url) | round(price)`.
2. **DB** : lookup `externalUrl` avant insert → incrément des vues sur le deal existant.

Safe de re-lancer `npm run ingest` toutes les 2h.

## Points d'attention

- **Images** : on stocke l'URL distante telle quelle dans `coverImageUrl`.
  Pour rapatrier vers Supabase Storage, étends `lib/write.ts` avec un
  appel au client Storage.
- **Karma** : chaque deal créé ajoute +5 karma au persona auteur (même
  règle que `createDealAction`). Après quelques runs, les karmas des
  personas vont bouger — normal.
- **Vote simulé** : on ne crée jamais plus de votes que de personas
  disponibles (11 max par deal). Si tu veux plus, ajoute des personas.
- **Flux RSS cassés** : le CLI log un warn mais continue avec les
  autres sources.
