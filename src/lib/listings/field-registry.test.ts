import { describe, expect, it } from "vitest";
import {
  coerceAttribute,
  denormalizeAttributes,
  formatAttribute,
  getFieldsForCategory,
  summarizeAttributesForCard,
  type FieldDef,
} from "@/lib/listings/field-registry";

/**
 * Les libellés fr-FR produits par Intl utilisent l'espace fine insécable
 * (U+202F) comme séparateur de milliers — on normalise en espace simple
 * pour des assertions lisibles.
 */
const norm = (s: string | null): string | null =>
  s === null ? null : s.replace(/[  ]/g, " ");

/** Raccourci : champ `name` de la catégorie voitures (présent par contrat). */
function voitureField(name: string): FieldDef {
  const field = getFieldsForCategory("voitures").find((f) => f.name === name);
  if (!field) throw new Error(`Champ voitures.${name} introuvable`);
  return field;
}

describe("getFieldsForCategory / resolveCategorySlug", () => {
  it("renvoie les champs voitures avec marque/modele/annee/kilometrage/carburant", () => {
    const fields = getFieldsForCategory("voitures");
    const names = fields.map((f) => f.name);
    expect(names).toEqual(
      expect.arrayContaining(["marque", "modele", "annee", "kilometrage", "carburant", "boite"]),
    );
    expect(voitureField("annee").type).toBe("number");
    expect(voitureField("annee").min).toBe(1950);
    expect(voitureField("carburant").type).toBe("select");
  });

  it("une sous-catégorie aliasée hérite des champs de sa famille", () => {
    // smartphones-telephonie → multimedia-tech (CATEGORY_SLUG_ALIASES)
    expect(getFieldsForCategory("smartphones-telephonie")).toBe(
      getFieldsForCategory("multimedia-tech"),
    );
    // chiens → animaux
    expect(getFieldsForCategory("chiens")).toBe(getFieldsForCategory("animaux"));
    const animauxNames = getFieldsForCategory("chiens").map((f) => f.name);
    expect(animauxNames).toContain("espece");
  });

  it("une entrée dédiée du registry est prioritaire (slug direct)", () => {
    // "voitures" est une entrée directe, pas un alias : le premier champ
    // est bien marque (ordre du formulaire voiture).
    expect(getFieldsForCategory("voitures")[0]?.name).toBe("marque");
  });

  it("renvoie [] pour un slug inconnu, null ou undefined", () => {
    expect(getFieldsForCategory("categorie-fantome")).toEqual([]);
    expect(getFieldsForCategory(null)).toEqual([]);
    expect(getFieldsForCategory(undefined)).toEqual([]);
    expect(getFieldsForCategory("")).toEqual([]);
  });
});

describe("coerceAttribute", () => {
  it("boolean : 'on'/'true' → true, tout le reste → false", () => {
    const ct = voitureField("ct_valide");
    expect(coerceAttribute(ct, "on")).toBe(true);
    expect(coerceAttribute(ct, "true")).toBe(true);
    expect(coerceAttribute(ct, null)).toBe(false);
    expect(coerceAttribute(ct, "off")).toBe(false);
    expect(coerceAttribute(ct, "")).toBe(false);
  });

  it("number : coerce, accepte la virgule décimale, borne min/max", () => {
    const annee = voitureField("annee");
    expect(coerceAttribute(annee, "2019")).toBe(2019);
    expect(coerceAttribute(annee, "1949")).toBeNull(); // < min 1950
    const beyondMax = String(new Date().getFullYear() + 2);
    expect(coerceAttribute(annee, beyondMax)).toBeNull(); // > max année+1

    const km = voitureField("kilometrage");
    expect(coerceAttribute(km, "85000")).toBe(85_000);
    expect(coerceAttribute(km, "-1")).toBeNull(); // < min 0
    expect(coerceAttribute(km, "2500000")).toBeNull(); // > max 2e6
    expect(coerceAttribute(km, "1234,5")).toBe(1234.5); // virgule → point
    expect(coerceAttribute(km, "abc")).toBeNull();
  });

  it("number / select / text : chaîne vide ou null → null", () => {
    expect(coerceAttribute(voitureField("annee"), "")).toBeNull();
    expect(coerceAttribute(voitureField("annee"), null)).toBeNull();
    expect(coerceAttribute(voitureField("carburant"), "")).toBeNull();
    expect(coerceAttribute(voitureField("marque"), "   ")).toBeNull();
  });

  it("select : valeur hors options → null, valeur trimée acceptée", () => {
    const carburant = voitureField("carburant");
    expect(coerceAttribute(carburant, "diesel")).toBe("diesel");
    expect(coerceAttribute(carburant, " diesel ")).toBe("diesel");
    expect(coerceAttribute(carburant, "kerosene")).toBeNull();
    expect(coerceAttribute(carburant, "Diesel")).toBeNull(); // sensible à la casse
  });

  it("select sans options → null (défense en profondeur)", () => {
    const broken: FieldDef = { name: "x", label: "X", type: "select" };
    expect(coerceAttribute(broken, "any")).toBeNull();
  });

  it("date : n'accepte que YYYY-MM-DD strict", () => {
    const dateField = getFieldsForCategory("covoiturage").find((f) => f.name === "date_depart");
    if (!dateField) throw new Error("covoiturage.date_depart introuvable");
    expect(coerceAttribute(dateField, "2026-08-20")).toBe("2026-08-20");
    expect(coerceAttribute(dateField, "20/08/2026")).toBeNull();
    expect(coerceAttribute(dateField, "2026-8-2")).toBeNull();
  });

  it("text : trime et tronque à 200 caractères", () => {
    const marque = voitureField("marque");
    expect(coerceAttribute(marque, "  Peugeot  ")).toBe("Peugeot");
    expect(coerceAttribute(marque, "x".repeat(250))).toBe("x".repeat(200));
  });
});

describe("formatAttribute", () => {
  it("null / undefined / chaîne vide → null", () => {
    const marque = voitureField("marque");
    expect(formatAttribute(marque, null)).toBeNull();
    expect(formatAttribute(marque, "")).toBeNull();
  });

  it("boolean → Oui / Non", () => {
    const ct = voitureField("ct_valide");
    expect(formatAttribute(ct, true)).toBe("Oui");
    expect(formatAttribute(ct, false)).toBe("Non");
  });

  it("select → label de l'option, valeur inconnue → null", () => {
    const carburant = voitureField("carburant");
    expect(formatAttribute(carburant, "diesel")).toBe("Diesel");
    expect(formatAttribute(carburant, "hybride_rechargeable")).toBe("Hybride rechargeable");
    expect(formatAttribute(carburant, "kerosene")).toBeNull();
  });

  it("number → format fr-FR avec unité en suffixe", () => {
    const km = voitureField("kilometrage");
    expect(norm(formatAttribute(km, 85_000))).toBe("85 000 km");
    const annee = voitureField("annee"); // pas d'unité
    expect(norm(formatAttribute(annee, 2019))).toBe("2 019");
  });

  it("date YYYY-MM-DD → date longue fr-FR (UTC, sans dérive de fuseau)", () => {
    const dateField = getFieldsForCategory("covoiturage").find((f) => f.name === "date_depart");
    if (!dateField) throw new Error("covoiturage.date_depart introuvable");
    expect(formatAttribute(dateField, "2024-03-05")).toBe("05 mars 2024");
    // Valeur non parsable : renvoyée telle quelle (pas de crash).
    expect(formatAttribute(dateField, "not-a-date")).toBe("not-a-date");
  });
});

describe("denormalizeAttributes", () => {
  it("reconstruit toutes les colonnes filtrables depuis le JSON", () => {
    expect(
      denormalizeAttributes({
        annee: 2019,
        kilometrage: 85_000,
        surface: 75,
        pieces: 3,
        marque: "  Peugeot  ",
        carburant: "diesel",
        type_contrat: "cdi",
      }),
    ).toEqual({
      attrYear: 2019,
      attrMileageKm: 85_000,
      attrSurfaceM2: 75,
      attrRooms: 3,
      attrBrand: "Peugeot", // trimé
      attrFuel: "diesel",
      attrContract: "cdi",
    });
  });

  it("null / undefined / objet vide → toutes colonnes null", () => {
    const allNull = {
      attrYear: null,
      attrMileageKm: null,
      attrSurfaceM2: null,
      attrRooms: null,
      attrBrand: null,
      attrFuel: null,
      attrContract: null,
    };
    expect(denormalizeAttributes(null)).toEqual(allNull);
    expect(denormalizeAttributes(undefined)).toEqual(allNull);
    expect(denormalizeAttributes({})).toEqual(allNull);
  });

  it("arrondit les nombres et applique la garde SmallInt", () => {
    expect(denormalizeAttributes({ annee: 2019.4 }).attrYear).toBe(2019);
    expect(denormalizeAttributes({ surface: 40_000 }).attrSurfaceM2).toBeNull(); // > 32767
    expect(denormalizeAttributes({ pieces: 32_768 }).attrRooms).toBeNull();
    expect(denormalizeAttributes({ kilometrage: 3_000_000 }).attrMileageKm).toBe(3_000_000); // Int ok
    expect(denormalizeAttributes({ kilometrage: 3_000_000_000 }).attrMileageKm).toBeNull(); // > Int4
  });

  it("mauvais type ou valeur vide → null, jamais 0 ni chaîne vide", () => {
    expect(denormalizeAttributes({ annee: "2019" as never }).attrYear).toBeNull();
    expect(denormalizeAttributes({ kilometrage: Number.NaN }).attrMileageKm).toBeNull();
    expect(denormalizeAttributes({ marque: "" }).attrBrand).toBeNull();
    expect(denormalizeAttributes({ marque: "   " }).attrBrand).toBeNull();
    expect(denormalizeAttributes({ carburant: 42 as never }).attrFuel).toBeNull();
  });

  it("tronque les strings dénormalisées à 64 caractères", () => {
    expect(denormalizeAttributes({ marque: "x".repeat(80) }).attrBrand).toBe("x".repeat(64));
  });
});

describe("summarizeAttributesForCard", () => {
  it("voitures : année · km · carburant, formatés fr-FR", () => {
    const out = summarizeAttributesForCard("voitures", {
      annee: 2019,
      kilometrage: 85_000,
      carburant: "diesel",
    });
    expect(norm(out)).toBe("2 019 · 85 000 km · Diesel");
  });

  it("saute les clés manquantes sans placeholder", () => {
    expect(norm(summarizeAttributesForCard("voitures", { kilometrage: 85_000 }))).toBe("85 000 km");
  });

  it("boolean : label seul quand true, rien quand false", () => {
    const withBool = summarizeAttributesForCard("vente-terrain", {
      surface_terrain: 1000,
      constructible: true,
    });
    expect(norm(withBool)).toBe("1 000 m² · Constructible");
    const withoutBool = summarizeAttributesForCard("vente-terrain", {
      surface_terrain: 1000,
      constructible: false,
    });
    expect(norm(withoutBool)).toBe("1 000 m²");
  });

  it("ignore les clés hors registry (injection de données étrangères)", () => {
    const out = summarizeAttributesForCard("voitures", {
      annee: 2019,
      cle_piratee: "yo",
      surface: 120, // clé immo, pas voitures
    });
    expect(norm(out)).toBe("2 019");
  });

  it("sous-catégorie aliasée : chiens hérite du résumé animaux", () => {
    const out = summarizeAttributesForCard("chiens", {
      espece: "chien",
      sexe: "male",
      age_annees: 3,
    });
    expect(norm(out)).toBe("Chien · Mâle · 3 ans");
  });

  it("null quand catégorie absente, inconnue, ou attributs vides", () => {
    expect(summarizeAttributesForCard(null, { annee: 2019 })).toBeNull();
    expect(summarizeAttributesForCard(undefined, { annee: 2019 })).toBeNull();
    expect(summarizeAttributesForCard("categorie-fantome", { annee: 2019 })).toBeNull();
    expect(summarizeAttributesForCard("voitures", {})).toBeNull();
    expect(summarizeAttributesForCard("voitures", null)).toBeNull();
    expect(summarizeAttributesForCard("voitures", "pas-un-objet")).toBeNull();
  });
});
