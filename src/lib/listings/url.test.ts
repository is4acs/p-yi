import { describe, expect, it } from "vitest";
import {
  buildListingsUrl,
  countActiveFilters,
  DEFAULT_SORT,
  EMPTY_FILTERS,
  hasActiveFilters,
  parseFilters,
  parsePage,
  parseQuery,
  parseSort,
  parseType,
  type ListingsFilters,
} from "@/lib/listings/url";

/** Jeu complet de filtres, toutes les clés renseignées avec des valeurs valides. */
const FULL_FILTERS: ListingsFilters = {
  priceMin: 100,
  priceMax: 50_000,
  yearMin: 2015,
  kmMax: 120_000,
  surfaceMin: 45,
  rooms: 3,
  fuel: "diesel",
  brand: "Toyota",
  contract: "cdi",
};

describe("roundtrip buildListingsUrl → parseFilters", () => {
  it("re-parse un jeu complet de filtres à l'identique", () => {
    const url = buildListingsUrl({ filters: FULL_FILTERS });
    expect(url.startsWith("/annonces?")).toBe(true);
    const qs = url.slice("/annonces?".length);
    const parsed = parseFilters(new URLSearchParams(qs));
    expect(parsed).toEqual(FULL_FILTERS);
  });

  it("re-parse aussi sort/page/q/type depuis l'URL construite", () => {
    const url = buildListingsUrl({
      sort: "price-asc",
      category: "voitures",
      city: "cayenne",
      type: "offer",
      page: 3,
      q: "toyota hilux",
      filters: FULL_FILTERS,
    });
    const sp = new URLSearchParams(url.slice("/annonces?".length));
    expect(parseSort(sp.get("sort"))).toBe("price-asc");
    expect(parsePage(sp.get("page"))).toBe(3);
    expect(parseQuery(sp.get("q"))).toBe("toyota hilux");
    expect(parseType(sp.get("type"))).toBe("offer");
    expect(sp.get("category")).toBe("voitures");
    expect(sp.get("city")).toBe("cayenne");
    expect(parseFilters(sp)).toEqual(FULL_FILTERS);
  });

  it("omet les valeurs par défaut (sort=new, page=1) et les filtres null", () => {
    expect(
      buildListingsUrl({ sort: DEFAULT_SORT, page: 1, filters: EMPTY_FILTERS }),
    ).toBe("/annonces");
    expect(buildListingsUrl({})).toBe("/annonces");
  });

  it("un roundtrip de filtres vides redonne EMPTY_FILTERS", () => {
    const url = buildListingsUrl({ filters: EMPTY_FILTERS });
    expect(parseFilters(new URLSearchParams(url.split("?")[1] ?? ""))).toEqual(
      EMPTY_FILTERS,
    );
  });
});

describe("parseSort", () => {
  it("accepte les valeurs valides", () => {
    expect(parseSort("new")).toBe("new");
    expect(parseSort("price-asc")).toBe("price-asc");
    expect(parseSort("price-desc")).toBe("price-desc");
  });

  it("retombe sur 'new' pour invalide / undefined / null", () => {
    expect(parseSort("PRICE-ASC")).toBe("new");
    expect(parseSort("asc")).toBe("new");
    expect(parseSort("")).toBe("new");
    expect(parseSort(undefined)).toBe("new");
    expect(parseSort(null)).toBe("new");
  });
});

describe("parsePage", () => {
  it("parse un entier valide et tronque les décimales", () => {
    expect(parsePage("1")).toBe(1);
    expect(parsePage("3")).toBe(3);
    expect(parsePage("3.9")).toBe(3);
  });

  it("retombe sur 1 pour 0, négatif, non numérique, undefined, null", () => {
    expect(parsePage("0")).toBe(1);
    expect(parsePage("-2")).toBe(1);
    expect(parsePage("abc")).toBe(1);
    expect(parsePage("")).toBe(1);
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage(null)).toBe(1);
  });
});

describe("parseQuery", () => {
  it("accepte une requête d'au moins 2 caractères, trimée", () => {
    expect(parseQuery("ab")).toBe("ab");
    expect(parseQuery("  toyota  ")).toBe("toyota");
  });

  it("rejette < 2 caractères après trim", () => {
    expect(parseQuery("a")).toBeNull();
    expect(parseQuery(" a ")).toBeNull();
    expect(parseQuery("")).toBeNull();
    expect(parseQuery("  ")).toBeNull();
  });

  it("tronque à 100 caractères", () => {
    expect(parseQuery("x".repeat(150))).toBe("x".repeat(100));
  });

  it("renvoie null pour undefined / null", () => {
    expect(parseQuery(undefined)).toBeNull();
    expect(parseQuery(null)).toBeNull();
  });
});

describe("parseType", () => {
  it("accepte les 4 slugs valides", () => {
    expect(parseType("offer")).toBe("offer");
    expect(parseType("demand")).toBe("demand");
    expect(parseType("exchange")).toBe("exchange");
    expect(parseType("donation")).toBe("donation");
  });

  it("renvoie null pour invalide / undefined / null", () => {
    expect(parseType("sale")).toBeNull();
    expect(parseType("OFFER")).toBeNull();
    expect(parseType("")).toBeNull();
    expect(parseType(undefined)).toBeNull();
    expect(parseType(null)).toBeNull();
  });
});

describe("parseFilters", () => {
  it("renvoie EMPTY_FILTERS pour undefined / null / objet vide", () => {
    expect(parseFilters(undefined)).toEqual(EMPTY_FILTERS);
    expect(parseFilters(null)).toEqual(EMPTY_FILTERS);
    expect(parseFilters({})).toEqual(EMPTY_FILTERS);
    expect(parseFilters(new URLSearchParams())).toEqual(EMPTY_FILTERS);
  });

  it("prend la première valeur quand un paramètre est répété (Record)", () => {
    const parsed = parseFilters({ prixMin: ["100", "200"], marque: ["Toyota", "Renault"] });
    expect(parsed.priceMin).toBe(100);
    expect(parsed.brand).toBe("Toyota");
  });

  it("prend la première valeur quand un paramètre est répété (URLSearchParams)", () => {
    const parsed = parseFilters(new URLSearchParams("prixMin=100&prixMin=200"));
    expect(parsed.priceMin).toBe(100);
  });

  it("valide carburant / contrat contre l'allow-list", () => {
    expect(parseFilters({ carburant: "diesel" }).fuel).toBe("diesel");
    expect(parseFilters({ carburant: " electrique " }).fuel).toBe("electrique");
    expect(parseFilters({ carburant: "kerosene" }).fuel).toBeNull();
    expect(parseFilters({ contrat: "cdi" }).contract).toBe("cdi");
    expect(parseFilters({ contrat: "mission_ponctuelle" }).contract).toBe("mission_ponctuelle");
    expect(parseFilters({ contrat: "esclavage" }).contract).toBeNull();
    expect(parseFilters({ contrat: "CDI" }).contract).toBeNull();
  });

  it("borne les valeurs numériques", () => {
    expect(parseFilters({ prixMin: "-5" }).priceMin).toBeNull();
    expect(parseFilters({ prixMin: "2000000000" }).priceMin).toBeNull(); // > 1e9
    expect(parseFilters({ prixMin: "1000000000" }).priceMin).toBe(1_000_000_000); // == 1e9
    expect(parseFilters({ prixMin: "abc" }).priceMin).toBeNull();
    expect(parseFilters({ prixMin: "10,9" }).priceMin).toBe(10); // virgule décimale, floor
    expect(parseFilters({ kmMax: "3000000" }).kmMax).toBeNull(); // > 2e6
    expect(parseFilters({ pieces: "25" }).rooms).toBeNull(); // > 20
    expect(parseFilters({ pieces: "20" }).rooms).toBe(20);
    expect(parseFilters({ surfaceMin: "40000" }).surfaceMin).toBeNull(); // > 32767
    const beyondNextYear = String(new Date().getFullYear() + 2);
    expect(parseFilters({ anneeMin: beyondNextYear }).yearMin).toBeNull();
  });

  it("trime et tronque la marque à 64 caractères, rejette la chaîne vide", () => {
    expect(parseFilters({ marque: "  Toyota  " }).brand).toBe("Toyota");
    expect(parseFilters({ marque: "" }).brand).toBeNull();
    expect(parseFilters({ marque: "   " }).brand).toBeNull();
    expect(parseFilters({ marque: "x".repeat(80) }).brand).toBe("x".repeat(64));
  });
});

describe("hasActiveFilters", () => {
  it("false quand tout est null", () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
  });

  it("true dès qu'un filtre est actif", () => {
    expect(hasActiveFilters({ ...EMPTY_FILTERS, priceMin: 1 })).toBe(true);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, fuel: "diesel" })).toBe(true);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, contract: "cdi" })).toBe(true);
  });
});

describe("countActiveFilters", () => {
  it("compte 0 quand rien n'est actif", () => {
    expect(
      countActiveFilters({ category: null, city: null, type: null, filters: EMPTY_FILTERS }),
    ).toBe(0);
  });

  it("compte catégorie + ville + type + chaque attribut", () => {
    expect(
      countActiveFilters({
        category: "voitures",
        city: "cayenne",
        type: "offer",
        filters: { ...EMPTY_FILTERS, priceMin: 100, kmMax: 100_000 },
      }),
    ).toBe(5);
  });

  it("compte 12 quand tout est actif (3 + 9 attributs)", () => {
    expect(
      countActiveFilters({
        category: "voitures",
        city: "cayenne",
        type: "offer",
        filters: FULL_FILTERS,
      }),
    ).toBe(12);
  });

  it("ne compte pas q ni sort (absents de la signature)", () => {
    expect(
      countActiveFilters({ category: "voitures", city: null, type: null, filters: EMPTY_FILTERS }),
    ).toBe(1);
  });
});
