import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { formatPrice, formatRelativeTime } from "./format";

describe("formatPrice", () => {
  it("formate un nombre en euros fr-FR", () => {
    // Intl insère des espaces insécables (fines) — on normalise pour ne
    // tester que le contenu, pas la variante d'espace de la version ICU.
    expect(formatPrice(1250).replace(/\s/g, " ")).toBe("1 250,00 €");
  });

  it("accepte une string numérique", () => {
    expect(formatPrice("19.9").replace(/\s/g, " ")).toBe("19,90 €");
  });

  it("retombe sur — pour une valeur non numérique", () => {
    expect(formatPrice("abc")).toBe("—");
    expect(formatPrice(Number.NaN)).toBe("—");
  });
});

describe("formatRelativeTime", () => {
  const NOW = new Date("2026-08-13T12:00:00Z");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renvoie une chaîne vide pour null/undefined/date invalide", () => {
    expect(formatRelativeTime(null)).toBe("");
    expect(formatRelativeTime(undefined)).toBe("");
    expect(formatRelativeTime("pas-une-date")).toBe("");
  });

  it("fr : passé en minutes, heures, jours, mois", () => {
    expect(formatRelativeTime(new Date("2026-08-13T11:55:00Z"), "fr")).toBe(
      "il y a 5 minutes",
    );
    expect(formatRelativeTime(new Date("2026-08-13T09:00:00Z"), "fr")).toBe(
      "il y a 3 heures",
    );
    expect(formatRelativeTime(new Date("2026-08-10T12:00:00Z"), "fr")).toBe(
      "il y a 3 jours",
    );
    expect(formatRelativeTime(new Date("2026-06-13T12:00:00Z"), "fr")).toBe(
      "il y a 2 mois",
    );
  });

  it("fr : futur", () => {
    expect(formatRelativeTime(new Date("2026-08-16T12:00:00Z"), "fr")).toBe(
      "dans 3 jours",
    );
  });

  it("pt : libellés brésiliens", () => {
    expect(formatRelativeTime(new Date("2026-08-10T12:00:00Z"), "pt")).toBe(
      "há 3 dias",
    );
    expect(formatRelativeTime(new Date("2026-08-16T12:00:00Z"), "pt")).toBe(
      "em 3 dias",
    );
  });

  it("ht : créole haïtien fait main (passé « sa gen », futur « nan »)", () => {
    expect(formatRelativeTime(new Date("2026-08-10T12:00:00Z"), "ht")).toBe(
      "sa gen 3 jou",
    );
    expect(formatRelativeTime(new Date("2026-08-13T11:15:00Z"), "ht")).toBe(
      "sa gen 45 min",
    );
    expect(formatRelativeTime(new Date("2026-08-13T15:00:00Z"), "ht")).toBe(
      "nan 3 è",
    );
    expect(formatRelativeTime(new Date("2026-05-13T12:00:00Z"), "ht")).toBe(
      "sa gen 3 mwa",
    );
  });

  it("accepte une date ISO en string", () => {
    expect(formatRelativeTime("2026-08-10T12:00:00Z", "fr")).toBe(
      "il y a 3 jours",
    );
  });

  it("défaut : locale fr", () => {
    expect(formatRelativeTime(new Date("2026-08-10T12:00:00Z"))).toBe(
      "il y a 3 jours",
    );
  });
});
