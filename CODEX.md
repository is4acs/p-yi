# Notes pour Codex

Ce fichier centralise les retours/ajustements faits par Claude sur les travaux de Codex. À lire avant de relancer une passe sur la branche `codex/seo-local-guyane-architecture`.

## 2026-04-23 — Optimisation affichage SEO (HomePillarLinks)

### Contexte
Le bloc `HomePillarLinks` ajouté dans `feat(seo): add local SEO architecture for Guyane pages` (`df5a349`) listait 20+ liens en deux colonnes sur la home, chacun avec un libellé long et répétitif (« Voir les bons plans à… », « Voir les annonces… »). Résultat visuel : mur de texte orange, cognitive load élevé, beaucoup de scroll sur mobile.

### Changement
Refactor du seul composant `src/components/seo/HomePillarLinks.tsx` :

- CTA pôle « Tout voir » mis en avant à droite de chaque colonne (vers `/bons-plans/guyane` et `/annonces/guyane`), avec `ArrowRight` et anchor text SEO complet via `sr-only`.
- Deux sous-sections par colonne : **Par ville** et **Par catégorie**, chacune précédée d'un mini-label discret (icônes `MapPin` / `Tag`).
- Les liens villes/catégories deviennent des **chips** (pill-buttons, bordure fine, hover orange) au lieu de listes `<li>` pleine largeur.
- Libellé visible réduit au nom propre (« Cayenne », « Voitures »…) mais l'anchor text reste descriptif pour Google grâce à un préfixe en `sr-only` : `<span class="sr-only">Voir les bons plans à </span>Cayenne`. Le crawler lit donc toujours « Voir les bons plans à Cayenne » — zéro perte SEO, UX beaucoup plus propre.
- Attribut `title` ajouté pour tooltip au survol.

### Ce qui n'a pas changé
- URLs, sitemaps, canonicals, JSON-LD, `local-pages.ts`, `SeoBlocks.tsx` : intouchés.
- Les autres blocs SEO visibles (`SeoIntro`, `ExplorerAlso`, `SeoFaq`) sont déjà compacts et lisibles, pas de refactor nécessaire.
- Le set de villes (5) / catégories deal (4) / catégories annonces (7) reste identique.

### Pour les prochaines passes Codex
- Si tu ajoutes de nouvelles villes ou catégories piliers, le composant scale automatiquement (chips en `flex-wrap`), mais garde-leur un nom court sinon le chip casse. Pour un nom long type « Saint-Laurent-du-Maroni », pense à vérifier mobile 360px.
- Le pattern « visible court + `sr-only` pour l'anchor text » est utilisable pour toute autre liste dense de liens SEO (ex. futures pages « ville + catégorie » si elles sont exposées sur la home).
- Ne pas remettre les libellés longs en visible sur la home : ça regénèrerait le problème. Les anchors restent descriptifs côté DOM, c'est ce qui compte pour Google.
- Les icônes `lucide-react` (`ArrowRight`, `MapPin`, `Tag`) sont déjà importées en prod sur d'autres composants — pas de coût bundle additionnel.

### Commits liés
- Branche : `claude/review-codex-changes-J0U5y`
- Commit : `ui(seo): compact HomePillarLinks with chips + sr-only anchor text`
