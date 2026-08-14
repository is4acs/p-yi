import { describe, expect, it } from "vitest";

import { safeInternalPath } from "./safe-redirect";

/**
 * `safeInternalPath` protège tous les `?next=` du parcours auth contre
 * l'open redirect — chaque vecteur documenté dans le module a son test.
 */
describe("safeInternalPath", () => {
  it("accepte un chemin interne simple", () => {
    expect(safeInternalPath("/poster")).toBe("/poster");
    expect(safeInternalPath("/annonces?category=voitures&page=2")).toBe(
      "/annonces?category=voitures&page=2",
    );
    expect(safeInternalPath("/bons-plans#comments")).toBe(
      "/bons-plans#comments",
    );
  });

  it("retombe sur le fallback pour null/undefined/vide", () => {
    expect(safeInternalPath(null)).toBe("/");
    expect(safeInternalPath(undefined, "/bons-plans")).toBe("/bons-plans");
    expect(safeInternalPath("", "/bons-plans")).toBe("/bons-plans");
  });

  it("rejette les URLs absolues", () => {
    expect(safeInternalPath("https://evil.com")).toBe("/");
    expect(safeInternalPath("http://evil.com/phish")).toBe("/");
    expect(safeInternalPath("javascript:alert(1)")).toBe("/");
  });

  it("rejette les protocol-relative //evil.com", () => {
    expect(safeInternalPath("//evil.com")).toBe("/");
    expect(safeInternalPath("//evil.com/path")).toBe("/");
  });

  it("rejette le backslash-escape /\\evil.com", () => {
    expect(safeInternalPath("/\\evil.com")).toBe("/");
  });

  it("rejette le userinfo-trick @evil.com", () => {
    expect(safeInternalPath("@evil.com")).toBe("/");
    expect(safeInternalPath("https://peyi.gf@evil.com")).toBe("/");
  });

  it("rejette tout ce qui ne commence pas par /", () => {
    expect(safeInternalPath("evil.com")).toBe("/");
    expect(safeInternalPath("mailto:x@y.z")).toBe("/");
    expect(safeInternalPath(" /poster")).toBe("/");
  });

  it("normalise les encodages exotiques sans sortir de l'origine", () => {
    // Un chemin encodé reste un chemin interne après résolution.
    const out = safeInternalPath("/annonces%2F..%2F..%2Fx");
    expect(out.startsWith("/")).toBe(true);
    expect(out).not.toContain("evil");
  });
});
