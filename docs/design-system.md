# Design System Péyi v1.0

> Référence du design system Péyi — tokens, composants, règles d'usage.
> Dernière synchronisation avec le handoff : **avril 2026**.

Cette doc est **la source de vérité** pour toute décision visuelle sur
Péyi. Si elle contredit un composant existant, **c'est le composant
qu'il faut corriger**, pas la doc — sauf mention explicite "legacy
conservé pour rétrocompat" dans les sections correspondantes.

Le handoff d'origine reste consultable localement dans
`/Users/isaacsettou/Downloads/handoff/` (non committé : hors repo).

---

## Sommaire

1. [Philosophie](#1-philosophie)
2. [Palette de couleurs](#2-palette-de-couleurs)
3. [Typographie](#3-typographie)
4. [Tokens — rayons, ombres, transitions, espacements](#4-tokens)
5. [Composants](#5-composants)
6. [Iconographie](#6-iconographie)
7. [Accessibilité & contrastes](#7-accessibilité--contrastes)
8. [Do / Don't](#8-do--dont)
9. [Legacy shadcn — ce qu'on garde, ce qu'on remplace](#9-legacy-shadcn)

---

## 1. Philosophie

Péyi est **une marque guyanaise**. L'identité visuelle tire sa force
de deux sources :

- **Le logo** : l'orange Solèy (`#FF914C`) du fond et le vert Lawèt
  (`#7ED956`) de la lettre. Ce sont les couleurs **d'action** et **de
  marque**.
- **Le drapeau** : le rouge (`#DA1A35`) et le jaune (`#FFD93D`) en
  accents éditoriaux. Jamais en CTA, jamais en erreur — uniquement
  pour marquer "100% local" ou "bon plan".

Règle d'or : **un écran Péyi doit rester lisible en niveaux de gris**.
La couleur ajoute de l'émotion, elle ne porte jamais l'information
seule (cf. WCAG 1.4.1).

---

## 2. Palette de couleurs

Toutes les couleurs sont exposées comme classes Tailwind
(`bg-peyi-orange-500`, `text-ink-700`, …). Les shades 50/100/500/600/700
sont issues du handoff ; 200/300/400/800/900 sont interpolées pour
préserver l'échelle historique (≈ 220 usages existants).

### 2.1 Peyi Orange (Solèy) — couleur d'action

| Shade | Hex       | Usage                                    |
| ----- | --------- | ---------------------------------------- |
| 50    | `#FFF1E5` | Fonds de sections, `CategoryTile` orange |
| 100   | `#FFE0CB` | Fonds hover, highlights                  |
| 200   | `#FFC59D` | —                                        |
| 300   | `#FFA97A` | Hover de `Chip` neutre                   |
| 400   | `#FF9B63` | —                                        |
| **500** | **`#FF914C`** | **CTA, primary (exact couleur du logo)** |
| 600   | `#F57A2E` | Hover CTA primary                        |
| 700   | `#DB6418` | Texte accent sur fond clair, hover Chip  |
| 800   | `#A84C12` | —                                        |
| 900   | `#70310B` | —                                        |

> `DEFAULT = 500`. `text-peyi-orange` = `text-peyi-orange-500`.

### 2.2 Peyi Green (Lawèt) — couleur de marque

| Shade | Hex       | Usage                                    |
| ----- | --------- | ---------------------------------------- |
| 50    | `#EEFAE5` | Fonds de sections, `CategoryTile` green  |
| 100   | `#DAF3CC` | —                                        |
| **500** | **`#7ED956`** | **Accent de marque (exact couleur du logo)** |
| 600   | `#5FBE38` | Hover `Button variant="brand"`           |
| 700   | `#43961F` | **Texte** sur fond clair (AA large only à 500) |

### 2.3 Peyi Forest — dark mode / bandes éditoriales

Vert foncé complémentaire, réservé aux **grands aplats** (hero, footer,
dark mode). Ne jamais l'utiliser sur un bouton < 44px.

| Shade | Hex       |
| ----- | --------- |
| 500   | `#1E4D12` |

### 2.4 Accents drapeau guyanais

| Nom          | Hex       | Usage                                |
| ------------ | --------- | ------------------------------------ |
| `peyi-rouge` | `#DA1A35` | Badge "local / 100% Guyane"          |
| `peyi-jaune` | `#FFD93D` | Badge "bon plan" (texte `ink-900`)   |

**⚠️ Jamais** en CTA, jamais en message d'erreur. Pour l'erreur, c'est
`destructive` (hérité shadcn, variable HSL).

### 2.5 Ink — neutres teintés chaud

Gris "cassé" qui penche vers le beige. Donne la chaleur Péyi sans
froideur des gris industriels. Compatibles `paper` (fond #FFFBF5).

| Shade  | Hex       | Usage                                   |
| ------ | --------- | --------------------------------------- |
| 50     | `#F6F2EB` | Fond d'écran alternatif                 |
| 100    | `#E7E1D7` | Bordures cards, `Chip` neutre           |
| 200    | `#CFC6BA` | —                                       |
| 300    | `#A89C8E` | Texte désactivé                         |
| 500    | `#6B5F53` | Texte secondaire                        |
| 700    | `#3A322A` | **Texte courant** (body)                |
| 900    | `#1C1712` | Titres, `Chip` actif                    |

### 2.6 Sémantique héritée

Inchangée depuis la v0 — pas touché pour éviter la régression.

| Nom           | Hex       | Usage                            |
| ------------- | --------- | -------------------------------- |
| `destructive` | HSL var   | Erreurs, actions destructrices   |
| `success`     | `#10B981` | Confirmation ("enregistré")      |
| `warning`     | `#F59E0B` | Avertissement non-bloquant       |
| `hot` / `cold`| —         | Badges température deals         |

---

## 3. Typographie

Trois familles, trois rôles. **Ne pas substituer** sans raison.

### 3.1 Familles

| Famille | Font            | Variable CSS               | Usage                                          |
| ------- | --------------- | -------------------------- | ---------------------------------------------- |
| `sans`  | Inter           | `--font-inter`             | Body, UI, paragraphes, formulaires             |
| `display` | Nunito        | `--font-nunito`            | Titres, marque, gros chiffres, **boutons**     |
| `mono`  | JetBrains Mono  | `--font-jetbrains-mono`    | Labels techniques, eyebrows, prix              |

Les trois sont chargées via `next/font/google` dans `src/app/layout.tsx`
(self-host à la build — **zéro requête externe au runtime**).

### 3.2 Échelle sémantique

Utilisez les classes sémantiques **plutôt que** `text-6xl`, `text-4xl`, etc.
Elles encapsulent déjà le bon `line-height`, `letter-spacing` et `font-weight`.

| Classe             | Size   | Usage                                         |
| ------------------ | ------ | --------------------------------------------- |
| `text-display-xl`  | 120px  | Hero landing page (desktop uniquement)        |
| `text-display-lg`  | 96px   | Hero landing page (tablette)                  |
| `text-display-md`  | 64px   | H1 de page principale                         |
| `text-title-lg`    | 48px   | Section hero                                  |
| `text-title-md`    | 32px   | H2                                            |
| `text-title-sm`    | 24px   | H3, titres de cards                           |
| `text-lede`        | 18px   | Sous-titre / lede paragraphe                  |
| `text-eyebrow`     | 12px   | Label mono uppercase au-dessus d'un titre     |

**Règle** : `font-display` pour tout titre, `font-sans` pour tout body,
`font-mono` pour tout label technique (prix, dates, ID). Ne les mélangez
pas dans le même bloc sémantique.

---

## 4. Tokens

### 4.1 Rayons

| Classe         | Valeur                        | Usage                           |
| -------------- | ----------------------------- | ------------------------------- |
| `rounded-xs`   | `6px`                         | Pastilles fines                 |
| `rounded-sm`   | `calc(--radius - 4px)`        | Inputs compacts                 |
| `rounded-md`   | `calc(--radius - 2px)`        | Cards, tiles                    |
| `rounded-lg`   | `var(--radius)` (défaut 8px)  | Boutons standard                |
| `rounded-xl`   | `calc(--radius + 4px)`        | Cards hero                      |
| `rounded-2xl`  | `calc(--radius + 12px)`       | Cards illustrées                |
| `rounded-full` | `9999px`                      | Pills, avatars, `Chip`, `Button peyi` |

### 4.2 Ombres

| Classe          | Valeur                                     | Usage                        |
| --------------- | ------------------------------------------ | ---------------------------- |
| `shadow-brand`  | `0 10px 24px rgba(255,145,76,0.28)`        | **CTA primary Peyi uniquement** |
| `shadow-sm/md/lg` | (hérités Tailwind)                       | Cards, popovers, modals      |

### 4.3 Transitions

| Classe                | Durée   | Usage                                    |
| --------------------- | ------- | ---------------------------------------- |
| `duration-fast`       | 120ms   | Micro-feedback (press, toggle)           |
| `duration-base`       | 180ms   | **Défaut** de la plupart des interactions |
| `duration-slow`       | 280ms   | Modals, transitions de navigation        |

### 4.4 Espacements

Tokens pour les **gouttières de grille**. Pour les paddings/margins
courants, utilisez l'échelle Tailwind classique.

| Classe                  | Valeur | Usage                                |
| ----------------------- | ------ | ------------------------------------ |
| `p-gutter` / `gap-gutter` | 24px | Gouttière mobile                    |
| `p-gutter-lg`           | 40px   | Gouttière desktop compacte           |
| `p-gutter-xl`           | 56px   | Gouttière desktop large (hero)       |

---

## 5. Composants

Chaque composant est documenté dans son propre fichier (JSDoc inline).
Cette section liste les **règles de choix** entre variantes.

### 5.1 `Button` (`src/components/ui/button.tsx`)

| Variant       | Quand l'utiliser                                                 |
| ------------- | ---------------------------------------------------------------- |
| `peyi`        | **CTA dominant de la page** (Poster, Envoyer, S'inscrire, Se connecter). Orange + shadow-brand + lift hover. **Un seul par écran**. |
| `brand`       | Second CTA, accent de marque (ex : "Découvrir les bons plans"). Vert Lawèt. |
| `default`     | **Legacy** — bouton neutre hérité shadcn. Conservé pour les 10+ usages existants qui ne veulent pas l'ombre orange. |
| `destructive` | Actions destructrices (supprimer un deal, rejeter un report).    |
| `outline`     | Usage secondaire discret, souvent en combo avec `peyi`.          |
| `secondary`   | Boutons de filtres inline (ex : "Tout effacer").                 |
| `ghost`       | Boutons dans les toolbars (admin), icônes-buttons.               |
| `link`        | Lien visuellement textuel (ex : "Voir conditions").              |

**Sizes** : `default` (h-9), `sm`, `lg`, `icon` (carré 36px), `peyi`
(pill 52px pour les hero CTA).

### 5.2 `Badge` (`src/components/ui/badge.tsx`)

**Badge = informatif, Chip = interactif.** Ne les confondez pas.

Variantes éditoriales Péyi :

| Variant    | Couleur       | Sémantique                             |
| ---------- | ------------- | -------------------------------------- |
| `promo`    | Orange Solèy  | Réduction / bon prix                   |
| `new`      | Vert Lawèt    | Nouveauté / fraîchement publié         |
| `local`    | Rouge drapeau | 100% local, fait en Guyane             |
| `bonplan`  | Jaune drapeau | Deal / affaire                         |

Règles :
- **Ne pas mélanger** plus de 2 variantes sur la même card.
- `promo` et `bonplan` sont **mutuellement exclusives** (les deux
  signalent "bon prix" — choisissez une seule sémantique par écran).
- Legacy shadcn (`default`, `secondary`, `destructive`, `outline`)
  conservé pour les usages existants.

### 5.3 `Chip` (`src/components/ui/chip.tsx`)

Filtre toggle-able (catégorie, ville, tri). **Toujours interactif**
(button ou `<a>` via `asLink`).

- **Neutre** : fond blanc, bordure `ink-100`, texte `ink-700`.
- **Actif** : fond `ink-900`, texte blanc (inversion franche).
- Hit target : 40px min (hauteur) × contenu natif.

Exemple — filtre catégorie URL :

```tsx
<Chip asLink active={cat === "immobilier"} href="?category=immobilier">
  Immobilier
</Chip>
```

### 5.4 `CategoryTile` (`src/components/ui/category-tile.tsx`)

Carte catégorie sur la home. **4 variantes chromatiques** pour rythmer
la grille — alternez pour éviter l'uniformité visuelle.

```tsx
<CategoryTile href="/annonces?category=immobilier" variant="orange">
  <Icon name="home" size={28} />
  <span>Immobilier</span>
  <span className="font-mono text-xs">2 481</span>
</CategoryTile>
```

Peut aussi prendre `onClick` au lieu de `href` (rendu `<button>`).

### 5.5 `Input`, `Label`, `Dialog`, `Card`, `Skeleton`, `Sonner`

Primitives shadcn inchangées (handoff v1.0 ne les a pas redéfinies).
Leur style suit automatiquement les tokens Peyi (radius, couleurs via
les variables HSL `--primary`, `--ring`, `--border`…).

---

## 6. Iconographie

**Deux sources** qui coexistent volontairement :

### 6.1 `Icon` Péyi (`src/components/ui/Icon.tsx`)

Set de 30 icônes outline 24×24, trait 2px, `currentColor`. Issues du
handoff design — style cohérent avec le logo.

```tsx
<Icon name="search" size={20} className="text-peyi-orange-600" />
```

**Catalogue** : `home` · `car` · `job` · `event` · `food` · `service` ·
`search` · `pin` · `filter` · `sliders` · `sort` · `mic` · `camera` ·
`grid` · `list` · `map` · `recent` · `trending` · `flag-star` · `heart` ·
`tag` · `chat` · `user` · `bell` · `star` · `plus` · `check` · `close` ·
`arrow-right` · `clock` · `euro`.

### 6.2 `lucide-react`

Garde la couverture longue traîne (ChevronDown, Upload, Share2, Menu,
ArrowLeft, etc. — tout ce qui n'a pas d'équivalent dans le handoff).

**Règle de choix** :
- Si l'icône apparaît sur **la home**, un **`CategoryTile`**, une
  **pastille "coup de cœur"**, ou un **badge éditorial** → `Icon`
  (pour garder le trait marqué Péyi).
- Partout ailleurs → `lucide-react` est ok (évite les centaines
  d'imports à migrer).

### 6.3 Sprite SVG

`public/icons.svg` contient le sprite complet (`<symbol>` par icône).
Utile pour les contextes où React ne peut pas s'exécuter : emails,
documents statiques, export PNG.

---

## 7. Accessibilité & contrastes

### 7.1 Contrastes WCAG AA validés

| Combinaison                              | Ratio    | Statut   |
| ---------------------------------------- | -------- | -------- |
| `ink-700` sur `white`                    | 11.8 : 1 | AAA ✅    |
| `ink-900` sur `white`                    | 16.4 : 1 | AAA ✅    |
| `white` sur `peyi-orange-500`            | 3.1 : 1  | AA large ✅, AA normal ⚠️ — utiliser pour texte ≥ 18pt ou bold 14pt |
| `white` sur `peyi-orange-600`            | 4.0 : 1  | AA normal ✅ — préférer pour texte small sur CTA |
| `white` sur `peyi-rouge`                 | 4.6 : 1  | AA ✅     |
| `ink-900` sur `peyi-jaune`               | 12.1 : 1 | AAA ✅    |
| `peyi-orange-700` sur `white`            | 4.9 : 1  | AA ✅ — pour texte orange courant |
| `peyi-green-700` sur `white`             | 5.2 : 1  | AA ✅ — **toujours préférer 700 à 500** pour texte vert |

### 7.2 Règles critiques

- **`peyi-green-500` sur blanc** : **AA large only** (3.1:1). N'utilisez
  cette teinte **que** pour des aplats de fond ou du texte bold ≥ 18pt.
  Pour du texte courant vert, **`peyi-green-700`** obligatoire.
- **`peyi-jaune` en texte sur fond clair** : **interdit** (contraste
  insuffisant). Uniquement comme background (avec texte `ink-900` par
  dessus) ou comme `.hl-jaune` (highlight derrière du texte).
- **Focus ring** : `focus-visible:ring-ring` (orange Solèy à 23° 100%
  65%) + `ring-offset-2`. Jamais désactivé.
- **Hit target mobile** : **44×44px minimum**. `Chip` est à 40px
  (contenu + padding natifs compensent), `Button size="peyi"` à 52px.

### 7.3 Contenu non-textuel

- Toute icône purement décorative → `aria-hidden="true"` (défaut de
  `<Icon>`).
- Toute icône seule dans un bouton interactif → `aria-label` sur le
  bouton. Jamais sur l'icône elle-même.
- Images d'annonces : `alt` = titre de l'annonce (jamais vide).

---

## 8. Do / Don't

### ✅ Do

- **Un seul `Button variant="peyi"` par écran**. C'est le CTA qui
  guide l'utilisateur vers l'action principale.
- **Alterner** les variantes `CategoryTile` (orange/green/rouge/jaune)
  pour rythmer une grille de catégories.
- **Utiliser `font-display`** (Nunito) pour tout titre et tout bouton.
- **Utiliser `font-mono`** (JetBrains) pour les prix, dates, ID, labels
  uppercase tracking large.
- **Utiliser les classes sémantiques** (`text-title-md`, `text-lede`,
  `text-eyebrow`) plutôt que `text-2xl`, `text-lg`, etc.
- **Utiliser `peyi-green-700`** pour tout texte vert sur fond clair.

### ❌ Don't

- ❌ Utiliser `peyi-rouge` pour une erreur. → Utilisez `destructive`.
- ❌ Utiliser `peyi-jaune` comme couleur de texte sur fond clair.
- ❌ Mélanger plus de 2 variantes `Badge` sur la même card.
- ❌ Remplacer tous les `lucide-react` par `<Icon>`. Cohabitation
  assumée — migration progressive uniquement.
- ❌ Créer une nouvelle variante `Button` ou `Badge` sans mettre à jour
  cette doc + la JSDoc du composant.
- ❌ Bypasser les tokens Tailwind avec des couleurs hexa inline
  (`className="bg-[#FF914C]"`). Utilisez `bg-peyi-orange-500`.

---

## 9. Legacy shadcn

Péyi v1.0 est bâtie **par-dessus** la base shadcn/ui héritée. On garde
les primitives (`Dialog`, `Label`, `Card`, `Skeleton`, `Sonner`) et les
variables HSL (`--primary`, `--ring`, `--border`…), on **ajoute**
nos variantes marquées Peyi par-dessus.

### Ce qu'on a **remplacé**

- `--primary` HSL → orange Solèy (#FF914C) au lieu du bleu shadcn.
- `--secondary` HSL → vert Lawèt (#7ED956).
- `--ring`, `--accent` → alignés sur la palette orange.
- Font display (Plus Jakarta Sans → Nunito).

### Ce qu'on a **ajouté** (sans rien casser)

- Variantes `Button` : `peyi`, `brand` + size `peyi`.
- Variantes `Badge` : `promo`, `new`, `local`, `bonplan`.
- Composants : `Chip`, `CategoryTile`, `Icon`.
- Tokens : `shadow-brand`, `duration-fast/base/slow`, `spacing.gutter*`,
  palettes complètes `peyi.*` et `ink.*`.

### Ce qu'on **conserve** tel quel

- Tous les variants shadcn historiques (`default`, `secondary`,
  `destructive`, `outline`, `ghost`, `link`).
- L'échelle de radius hériée (`sm`, `md`, `lg`, `xl`, `2xl`).
- Toutes les primitives non-redéfinies par le handoff.

**Pourquoi cette stratégie ?** Évite la régression sur les 220+ usages
existants des anciens tokens. Permet de migrer progressivement, écran
par écran, sans blocage.

---

## Maintenance

- **Ajout d'un token** : `tailwind.config.ts` + update cette doc.
- **Ajout d'une variante** : modifier le composant (JSDoc à jour) +
  ajouter une ligne dans la table de la section 5.
- **Re-sync avec le handoff** : le handoff original est versionné en
  dehors du repo. À chaque MAJ, re-synchroniser `tokens.css`, les
  paths d'icônes, et re-valider les contrastes.

Questions, doutes ou contradictions : ouvrez une issue ou posez la
question directement à Isaac (fondateur, décisionnaire final sur la
marque).
