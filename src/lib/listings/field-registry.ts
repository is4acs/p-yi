/**
 * Registry des champs additionnels par catégorie d'annonce.
 *
 * Les valeurs sont stockées dans la colonne `Listing.attributes` (JSON) —
 * un blob typé par ce registre plutôt que par le schéma Prisma, pour que
 * l'ajout d'un champ sur une catégorie soit un changement code-only.
 *
 * Règles :
 *  - un champ absent du registry n'est jamais persisté (garde contre
 *    l'injection de clés arbitraires depuis un client bricolé).
 *  - un champ `required: true` bloque la soumission s'il est vide.
 *  - `select` attend une valeur dans `options`, `number` est coercé en
 *    Number, `boolean` accepte "on"/"off", `text` reste string.
 *
 * Ce module est pur (aucun import serveur) pour être utilisable à la fois
 * dans la Server Action de persistance et dans le formulaire client.
 */

export type FieldType = "text" | "number" | "select" | "boolean";

export type FieldOption = {
  value: string;
  label: string;
};

export type FieldDef = {
  /** Clé persistée dans `Listing.attributes`. Doit être un identifiant
   * snake_case pour rester lisible dans la DB. */
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  /** Liste d'options pour `type: "select"`. Ignoré sinon. */
  options?: FieldOption[];
  /** Unité affichée en suffixe (ex. "km", "m²"). */
  unit?: string;
  placeholder?: string;
  /** Texte d'aide discret affiché sous le champ. */
  help?: string;
  /** Borne min pour les nombres. */
  min?: number;
  /** Borne max pour les nombres. */
  max?: number;
};

// ----- Options réutilisables ----------------------------------------------

const DPE_OPTIONS: FieldOption[] = [
  { value: "A", label: "A" },
  { value: "B", label: "B" },
  { value: "C", label: "C" },
  { value: "D", label: "D" },
  { value: "E", label: "E" },
  { value: "F", label: "F" },
  { value: "G", label: "G" },
  { value: "vierge", label: "Vierge / non communiqué" },
];

const CARBURANT_OPTIONS: FieldOption[] = [
  { value: "essence", label: "Essence" },
  { value: "diesel", label: "Diesel" },
  { value: "hybride", label: "Hybride" },
  { value: "hybride_rechargeable", label: "Hybride rechargeable" },
  { value: "electrique", label: "Électrique" },
  { value: "gpl", label: "GPL" },
  { value: "autre", label: "Autre" },
];

const BOITE_OPTIONS: FieldOption[] = [
  { value: "manuelle", label: "Manuelle" },
  { value: "automatique", label: "Automatique" },
  { value: "semi_automatique", label: "Semi-automatique" },
];

const PERMIS_DEUX_ROUES: FieldOption[] = [
  { value: "sans_permis", label: "Sans permis (50cc)" },
  { value: "AM", label: "AM / BSR" },
  { value: "A1", label: "A1 (125cc)" },
  { value: "A2", label: "A2" },
  { value: "A", label: "A" },
];

const PORTES_OPTIONS: FieldOption[] = [
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
  { value: "5", label: "5" },
];

const GENRE_MODE_OPTIONS: FieldOption[] = [
  { value: "femme", label: "Femme" },
  { value: "homme", label: "Homme" },
  { value: "unisexe", label: "Unisexe" },
  { value: "enfant", label: "Enfant" },
  { value: "bebe", label: "Bébé" },
];

const TYPE_CONTRAT_OPTIONS: FieldOption[] = [
  { value: "cdi", label: "CDI" },
  { value: "cdd", label: "CDD" },
  { value: "interim", label: "Intérim" },
  { value: "stage", label: "Stage" },
  { value: "alternance", label: "Alternance" },
  { value: "freelance", label: "Freelance / indépendant" },
  { value: "mission_ponctuelle", label: "Mission ponctuelle" },
];

const TEMPS_TRAVAIL_OPTIONS: FieldOption[] = [
  { value: "temps_plein", label: "Temps plein" },
  { value: "temps_partiel", label: "Temps partiel" },
  { value: "ponctuel", label: "Ponctuel / occasionnel" },
];

const EXPERIENCE_OPTIONS: FieldOption[] = [
  { value: "debutant", label: "Débutant accepté" },
  { value: "1_3_ans", label: "1 à 3 ans" },
  { value: "3_5_ans", label: "3 à 5 ans" },
  { value: "5_plus", label: "5 ans et plus" },
];

const REMUNERATION_OPTIONS: FieldOption[] = [
  { value: "horaire", label: "Taux horaire" },
  { value: "mensuel", label: "Salaire mensuel" },
  { value: "annuel", label: "Salaire annuel" },
  { value: "forfait", label: "Forfait" },
  { value: "commission", label: "À la commission" },
];

const TECH_PRODUCT_OPTIONS: FieldOption[] = [
  { value: "smartphone", label: "Smartphone" },
  { value: "tablette", label: "Tablette" },
  { value: "laptop", label: "Ordinateur portable" },
  { value: "desktop", label: "Ordinateur fixe" },
  { value: "console", label: "Console de jeu" },
  { value: "tv", label: "TV / vidéo" },
  { value: "audio", label: "Audio / son" },
  { value: "photo_video", label: "Photo / vidéo" },
  { value: "accessoire", label: "Accessoire" },
  { value: "autre", label: "Autre" },
];

// ----- Définitions par catégorie -----------------------------------------

/**
 * Champs voiture (et dérivés 4×4, utilitaires) — inspirés de Leboncoin.
 * L'ordre correspond à celui rendu dans le formulaire.
 */
const VOITURE_FIELDS: FieldDef[] = [
  { name: "marque", label: "Marque", type: "text", required: true, placeholder: "Peugeot, Toyota…" },
  { name: "modele", label: "Modèle", type: "text", required: true, placeholder: "208, Hilux…" },
  {
    name: "annee",
    label: "Année",
    type: "number",
    required: true,
    min: 1950,
    max: new Date().getFullYear() + 1,
    placeholder: "2019",
  },
  {
    name: "kilometrage",
    label: "Kilométrage",
    type: "number",
    required: true,
    unit: "km",
    min: 0,
    max: 2_000_000,
    placeholder: "85000",
  },
  { name: "carburant", label: "Carburant", type: "select", options: CARBURANT_OPTIONS },
  { name: "boite", label: "Boîte de vitesses", type: "select", options: BOITE_OPTIONS },
  { name: "puissance", label: "Puissance", type: "number", unit: "ch", min: 1, max: 2000 },
  { name: "portes", label: "Portes", type: "select", options: PORTES_OPTIONS },
  { name: "places", label: "Places", type: "number", min: 1, max: 9 },
  { name: "couleur", label: "Couleur", type: "text", placeholder: "Blanc nacré" },
  {
    name: "ct_valide",
    label: "Contrôle technique à jour",
    type: "boolean",
    help: "Coche si le CT est valide pour les 6 prochains mois.",
  },
];

const MOTO_FIELDS: FieldDef[] = [
  { name: "marque", label: "Marque", type: "text", required: true, placeholder: "Yamaha, Honda…" },
  { name: "modele", label: "Modèle", type: "text", required: true, placeholder: "MT-07" },
  {
    name: "annee",
    label: "Année",
    type: "number",
    required: true,
    min: 1950,
    max: new Date().getFullYear() + 1,
  },
  {
    name: "kilometrage",
    label: "Kilométrage",
    type: "number",
    required: true,
    unit: "km",
    min: 0,
    max: 500_000,
  },
  {
    name: "cylindree",
    label: "Cylindrée",
    type: "number",
    unit: "cm³",
    min: 50,
    max: 3000,
    placeholder: "125",
  },
  { name: "permis", label: "Permis requis", type: "select", options: PERMIS_DEUX_ROUES },
  { name: "ct_valide", label: "Contrôle technique à jour (si requis)", type: "boolean" },
];

const UTILITAIRE_FIELDS: FieldDef[] = [
  { name: "marque", label: "Marque", type: "text", required: true },
  { name: "modele", label: "Modèle", type: "text", required: true },
  {
    name: "annee",
    label: "Année",
    type: "number",
    required: true,
    min: 1950,
    max: new Date().getFullYear() + 1,
  },
  {
    name: "kilometrage",
    label: "Kilométrage",
    type: "number",
    required: true,
    unit: "km",
    min: 0,
    max: 2_000_000,
  },
  { name: "carburant", label: "Carburant", type: "select", options: CARBURANT_OPTIONS },
  { name: "boite", label: "Boîte de vitesses", type: "select", options: BOITE_OPTIONS },
  {
    name: "charge_utile",
    label: "Charge utile",
    type: "number",
    unit: "kg",
    min: 0,
    max: 10_000,
    placeholder: "800",
  },
  { name: "places", label: "Places", type: "number", min: 1, max: 9 },
  {
    name: "volume_coffre",
    label: "Volume de chargement",
    type: "number",
    unit: "m³",
    min: 0,
    max: 50,
  },
];

/** Base commune aux logements (achat ou location, appart ou maison). */
const LOGEMENT_COMMON: FieldDef[] = [
  { name: "surface", label: "Surface habitable", type: "number", required: true, unit: "m²", min: 1, max: 1000 },
  { name: "pieces", label: "Pièces", type: "number", required: true, min: 1, max: 20 },
  { name: "chambres", label: "Chambres", type: "number", min: 0, max: 20 },
  { name: "annee_construction", label: "Année de construction", type: "number", min: 1800, max: new Date().getFullYear() },
  { name: "dpe", label: "DPE (étiquette énergie)", type: "select", options: DPE_OPTIONS },
  { name: "ges", label: "GES (étiquette climat)", type: "select", options: DPE_OPTIONS },
];

const VENTE_APPART_FIELDS: FieldDef[] = [
  ...LOGEMENT_COMMON,
  { name: "etage", label: "Étage", type: "number", min: -2, max: 60 },
  { name: "nb_etages_immeuble", label: "Étages de l'immeuble", type: "number", min: 1, max: 100 },
  { name: "ascenseur", label: "Ascenseur", type: "boolean" },
  { name: "balcon_terrasse", label: "Balcon / terrasse", type: "boolean" },
  { name: "parking", label: "Parking / box", type: "boolean" },
  { name: "cave", label: "Cave", type: "boolean" },
  { name: "piscine", label: "Piscine", type: "boolean" },
];

const LOCATION_APPART_FIELDS: FieldDef[] = [
  ...LOGEMENT_COMMON,
  { name: "etage", label: "Étage", type: "number", min: -2, max: 60 },
  { name: "ascenseur", label: "Ascenseur", type: "boolean" },
  { name: "meuble", label: "Meublé", type: "boolean" },
  { name: "balcon_terrasse", label: "Balcon / terrasse", type: "boolean" },
  { name: "parking", label: "Parking / box", type: "boolean" },
  { name: "charges_mensuelles", label: "Charges mensuelles", type: "number", unit: "€", min: 0, max: 10_000 },
  { name: "depot_garantie", label: "Dépôt de garantie", type: "number", unit: "€", min: 0, max: 100_000 },
];

const VENTE_MAISON_FIELDS: FieldDef[] = [
  ...LOGEMENT_COMMON,
  { name: "surface_terrain", label: "Surface du terrain", type: "number", unit: "m²", min: 0, max: 100_000 },
  { name: "etages", label: "Niveaux", type: "number", min: 1, max: 10 },
  { name: "jardin", label: "Jardin", type: "boolean" },
  { name: "piscine", label: "Piscine", type: "boolean" },
  { name: "garage", label: "Garage", type: "boolean" },
  { name: "terrasse", label: "Terrasse", type: "boolean" },
];

const LOCATION_MAISON_FIELDS: FieldDef[] = [
  ...LOGEMENT_COMMON,
  { name: "surface_terrain", label: "Surface du terrain", type: "number", unit: "m²", min: 0, max: 100_000 },
  { name: "meuble", label: "Meublée", type: "boolean" },
  { name: "jardin", label: "Jardin", type: "boolean" },
  { name: "piscine", label: "Piscine", type: "boolean" },
  { name: "garage", label: "Garage", type: "boolean" },
  { name: "charges_mensuelles", label: "Charges mensuelles", type: "number", unit: "€", min: 0, max: 10_000 },
  { name: "depot_garantie", label: "Dépôt de garantie", type: "number", unit: "€", min: 0, max: 100_000 },
];

const COLOCATION_FIELDS: FieldDef[] = [
  { name: "surface_chambre", label: "Surface de la chambre", type: "number", required: true, unit: "m²", min: 1, max: 200 },
  { name: "surface_totale", label: "Surface totale du logement", type: "number", unit: "m²", min: 1, max: 1000 },
  { name: "pieces", label: "Pièces totales", type: "number", min: 1, max: 20 },
  { name: "nb_colocataires_actuels", label: "Colocataires actuels", type: "number", min: 0, max: 20 },
  { name: "nb_colocataires_total", label: "Colocataires au total", type: "number", min: 1, max: 20 },
  { name: "meuble", label: "Chambre meublée", type: "boolean" },
  { name: "salle_bain_privee", label: "Salle de bain privée", type: "boolean" },
  { name: "charges_incluses", label: "Charges incluses dans le loyer", type: "boolean" },
];

const TERRAIN_FIELDS: FieldDef[] = [
  { name: "surface_terrain", label: "Surface du terrain", type: "number", required: true, unit: "m²", min: 1, max: 1_000_000 },
  { name: "constructible", label: "Constructible", type: "boolean" },
  { name: "viabilise", label: "Viabilisé (eau/électricité)", type: "boolean" },
  { name: "plat", label: "Terrain plat", type: "boolean" },
];

const LOCATION_SAISONNIERE_FIELDS: FieldDef[] = [
  { name: "capacite_personnes", label: "Capacité", type: "number", required: true, unit: "pers.", min: 1, max: 50 },
  { name: "chambres", label: "Chambres", type: "number", min: 0, max: 20 },
  { name: "surface", label: "Surface", type: "number", unit: "m²", min: 1, max: 1000 },
  { name: "piscine", label: "Piscine", type: "boolean" },
  { name: "climatisation", label: "Climatisation", type: "boolean" },
  { name: "wifi", label: "Wi-Fi inclus", type: "boolean" },
  { name: "animaux_acceptes", label: "Animaux acceptés", type: "boolean" },
];

const BUREAU_LOCAL_FIELDS: FieldDef[] = [
  { name: "surface", label: "Surface", type: "number", required: true, unit: "m²", min: 1, max: 10_000 },
  { name: "type_local", label: "Type de local", type: "text", placeholder: "Bureau, commerce, entrepôt…" },
  { name: "parking", label: "Parking disponible", type: "boolean" },
  { name: "vitrine", label: "Vitrine sur rue", type: "boolean" },
  { name: "charges_mensuelles", label: "Charges mensuelles", type: "number", unit: "€", min: 0, max: 50_000 },
];

const MULTIMEDIA_FIELDS: FieldDef[] = [
  { name: "type_produit", label: "Type de produit", type: "select", required: true, options: TECH_PRODUCT_OPTIONS },
  { name: "marque", label: "Marque", type: "text", required: true, placeholder: "Apple, Samsung…" },
  { name: "modele", label: "Modèle", type: "text", placeholder: "iPhone 14 Pro" },
  { name: "capacite_stockage", label: "Stockage", type: "text", placeholder: "128 Go, 1 To…" },
  { name: "couleur", label: "Couleur", type: "text" },
  { name: "avec_accessoires", label: "Accessoires inclus (boîte, chargeur…)", type: "boolean" },
  { name: "sous_garantie", label: "Sous garantie", type: "boolean" },
  { name: "debloque", label: "Débloqué tous opérateurs", type: "boolean" },
];

const EMPLOI_FIELDS: FieldDef[] = [
  { name: "type_contrat", label: "Type de contrat", type: "select", required: true, options: TYPE_CONTRAT_OPTIONS },
  { name: "temps_travail", label: "Temps de travail", type: "select", options: TEMPS_TRAVAIL_OPTIONS },
  { name: "experience_requise", label: "Expérience requise", type: "select", options: EXPERIENCE_OPTIONS },
  { name: "remuneration_type", label: "Type de rémunération", type: "select", options: REMUNERATION_OPTIONS },
  { name: "secteur", label: "Secteur / métier", type: "text", placeholder: "BTP, restauration, informatique…" },
  { name: "permis_requis", label: "Permis B requis", type: "boolean" },
  { name: "teletravail", label: "Télétravail possible", type: "boolean" },
];

const MODE_FIELDS: FieldDef[] = [
  { name: "genre", label: "Genre", type: "select", options: GENRE_MODE_OPTIONS },
  { name: "marque", label: "Marque", type: "text", placeholder: "Zara, Nike…" },
  { name: "taille", label: "Taille", type: "text", placeholder: "M, 42, 40 EU…" },
  { name: "couleur", label: "Couleur", type: "text" },
  { name: "matiere", label: "Matière", type: "text", placeholder: "Coton, cuir…" },
];

const VELO_FIELDS: FieldDef[] = [
  {
    name: "type_velo",
    label: "Type de vélo",
    type: "select",
    options: [
      { value: "ville", label: "Ville" },
      { value: "vtt", label: "VTT" },
      { value: "route", label: "Route" },
      { value: "vae", label: "Vélo électrique (VAE)" },
      { value: "bmx", label: "BMX" },
      { value: "enfant", label: "Enfant" },
      { value: "pliant", label: "Pliant" },
      { value: "cargo", label: "Cargo" },
    ],
  },
  { name: "marque", label: "Marque", type: "text" },
  { name: "taille_cadre", label: "Taille du cadre", type: "text", placeholder: "M, 54cm…" },
  { name: "annee", label: "Année", type: "number", min: 1950, max: new Date().getFullYear() + 1 },
];

const BATEAU_FIELDS: FieldDef[] = [
  { name: "type_embarcation", label: "Type", type: "text", required: true, placeholder: "Pirogue, hors-bord, voilier…" },
  { name: "longueur", label: "Longueur", type: "number", unit: "m", min: 1, max: 50 },
  { name: "annee", label: "Année", type: "number", min: 1950, max: new Date().getFullYear() + 1 },
  { name: "moteur", label: "Moteur", type: "text", placeholder: "Yamaha 40 CV" },
  { name: "heures_moteur", label: "Heures moteur", type: "number", unit: "h", min: 0 },
  { name: "remorque_incluse", label: "Remorque incluse", type: "boolean" },
];

// ----- Map slug → champs --------------------------------------------------

/**
 * Tous les champs additionnels par slug de catégorie feuille. Les slugs
 * absents de cette map n'exposent aucun champ additionnel — le formulaire
 * reste identique au socle générique.
 */
export const FIELD_REGISTRY: Record<string, FieldDef[]> = {
  // Véhicules
  voitures: VOITURE_FIELDS,
  "motos-scooters": MOTO_FIELDS,
  "quads-buggy": MOTO_FIELDS,
  "utilitaires-4x4": UTILITAIRE_FIELDS,
  "pirogues-bateaux": BATEAU_FIELDS,
  velos: VELO_FIELDS,

  // Immobilier
  "vente-appartement": VENTE_APPART_FIELDS,
  "vente-maison": VENTE_MAISON_FIELDS,
  "vente-terrain": TERRAIN_FIELDS,
  "location-appartement": LOCATION_APPART_FIELDS,
  "location-maison": LOCATION_MAISON_FIELDS,
  colocation: COLOCATION_FIELDS,
  "location-saisonniere": LOCATION_SAISONNIERE_FIELDS,
  "bureau-local-commercial": BUREAU_LOCAL_FIELDS,

  // Tech
  "multimedia-tech": MULTIMEDIA_FIELDS,

  // Emploi
  "emploi-services": EMPLOI_FIELDS,

  // Mode
  "mode-vide-dressing": MODE_FIELDS,
};

/**
 * Récupère les champs pour un slug de catégorie. Renvoie `[]` quand la
 * catégorie n'a pas de formulaire spécifique — l'appelant peut alors
 * masquer entièrement la section "Détails spécifiques".
 */
export function getFieldsForCategory(categorySlug: string | null | undefined): FieldDef[] {
  if (!categorySlug) return [];
  return FIELD_REGISTRY[categorySlug] ?? [];
}

/* -------------------------------------------------------------------------- */
/* Helpers coercion + formatting                                              */
/* -------------------------------------------------------------------------- */

/**
 * Valeur persistée côté DB — `null` pour un champ laissé vide, pour qu'on
 * distingue "non renseigné" d'une valeur réelle.
 */
export type AttributeValue = string | number | boolean | null;

/**
 * Coerce une string brute issue de FormData vers la valeur typée attendue
 * par un champ. Renvoie `null` quand la valeur est vide ou invalide (les
 * erreurs required sont levées plus haut, avant cette coercion).
 */
export function coerceAttribute(field: FieldDef, raw: FormDataEntryValue | null): AttributeValue {
  if (field.type === "boolean") {
    // Un checkbox HTML n'envoie la clé que s'il est coché — l'appelant
    // traite donc "absent" comme false. Ici on ne voit que "on".
    return raw === "on" || raw === "true";
  }

  if (raw === null) return null;
  const str = typeof raw === "string" ? raw.trim() : "";
  if (str === "") return null;

  switch (field.type) {
    case "number": {
      const n = Number(str.replace(",", "."));
      if (!Number.isFinite(n)) return null;
      if (field.min !== undefined && n < field.min) return null;
      if (field.max !== undefined && n > field.max) return null;
      return n;
    }
    case "select": {
      if (!field.options) return null;
      return field.options.some((o) => o.value === str) ? str : null;
    }
    case "text":
    default:
      // Garde-fou : pas de texte monstrueux persisté en base.
      return str.slice(0, 200);
  }
}

/**
 * Jolie sortie texte pour afficher une valeur sur la page détail.
 * Retourne `null` si la valeur est vide — l'appelant doit alors omettre
 * la ligne entière plutôt que d'afficher "—".
 */
export function formatAttribute(field: FieldDef, value: AttributeValue): string | null {
  if (value === null || value === undefined || value === "") return null;

  if (field.type === "boolean") {
    return value ? "Oui" : "Non";
  }

  if (field.type === "select" && field.options) {
    const match = field.options.find((o) => o.value === value);
    if (!match) return null;
    return match.label;
  }

  if (field.type === "number" && typeof value === "number") {
    const nf = new Intl.NumberFormat("fr-FR").format(value);
    return field.unit ? `${nf} ${field.unit}` : nf;
  }

  return String(value);
}

/**
 * Normalise un objet d'attributs lu depuis la DB : on ne garde que les
 * clés déclarées dans le registry pour la catégorie courante. Ça protège
 * l'UI de données héritées d'une autre catégorie après changement.
 */
export function pickRegisteredAttributes(
  categorySlug: string | null | undefined,
  raw: unknown,
): Record<string, AttributeValue> {
  const fields = getFieldsForCategory(categorySlug);
  if (fields.length === 0) return {};
  if (!raw || typeof raw !== "object") return {};
  const obj = raw as Record<string, unknown>;
  const out: Record<string, AttributeValue> = {};
  for (const f of fields) {
    const v = obj[f.name];
    if (v === undefined || v === null) continue;
    if (f.type === "number" && typeof v === "number") out[f.name] = v;
    else if (f.type === "boolean" && typeof v === "boolean") out[f.name] = v;
    else if ((f.type === "text" || f.type === "select") && typeof v === "string") out[f.name] = v;
  }
  return out;
}
