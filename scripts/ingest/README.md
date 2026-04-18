# Ingest — remplissage des bons plans Péyi

CLI local qui scrape des bons plans Guyane depuis plusieurs sources,
les déduplique, les classe (catégorie/ville/store/marchand), les
attribue à un des 12 personas (`scripts/ingest/personas.ts`), leur
ajoute un engagement simulé cohérent (votes, commentaires, température,
vues), et les écrit en DB via Prisma.

Tout tourne en local — aucune route API, aucun cron Vercel. Tu lances
quand tu veux, tu inspectes avant de committer en base, tu re-lances
sans dupliquer (dedupe par fingerprint + externalUrl).

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

| Nom                 | URL par défaut                          | Override env                     |
| ------------------- | --------------------------------------- | -------------------------------- |
| `local-file`        | `data/local-deals.json`                 | —                                |
| `blada-rss`         | `https://www.blada.com/feed/`           | `PEYI_INGEST_BLADA_RSS`          |
| `franceguyane-rss`  | `https://www.franceguyane.fr/rss.xml`   | `PEYI_INGEST_FRANCEGUYANE_RSS`   |

Les deux flux RSS peuvent changer d'URL (WordPress permet `?feed=rss2`,
`/feed/`, `/rss.xml`). Si un fetch renvoie 404, ajuste l'env.

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
