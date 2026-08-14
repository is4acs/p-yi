import { describe, expect, it } from "vitest";

import {
  completeProfileSchema,
  signInSchema,
  signUpSchema,
  usernameSchema,
} from "./auth";

describe("usernameSchema", () => {
  it("accepte les pseudos valides", () => {
    for (const u of ["marie973", "ti_punch", "a.b_c", "abc"]) {
      expect(usernameSchema.safeParse(u).success).toBe(true);
    }
  });

  it("rejette majuscules, accents, espaces, tirets et symboles", () => {
    for (const u of ["Marie", "mété973", "marie 973", "marie-973", "m@rie"]) {
      expect(usernameSchema.safeParse(u).success).toBe(false);
    }
  });

  it("borne la longueur à 3–20", () => {
    expect(usernameSchema.safeParse("ab").success).toBe(false);
    expect(usernameSchema.safeParse("a".repeat(21)).success).toBe(false);
    expect(usernameSchema.safeParse("a".repeat(20)).success).toBe(true);
  });
});

describe("signInSchema / signUpSchema", () => {
  it("exige un e-mail valide et 8 caractères de mot de passe", () => {
    expect(
      signInSchema.safeParse({ email: "a@b.gf", password: "12345678" }).success,
    ).toBe(true);
    expect(
      signInSchema.safeParse({ email: "pas-un-email", password: "12345678" })
        .success,
    ).toBe(false);
    expect(
      signInSchema.safeParse({ email: "a@b.gf", password: "court" }).success,
    ).toBe(false);
  });

  it("signUp exige en plus un pseudo valide", () => {
    expect(
      signUpSchema.safeParse({
        email: "a@b.gf",
        username: "marie973",
        password: "12345678",
      }).success,
    ).toBe(true);
    expect(
      signUpSchema.safeParse({
        email: "a@b.gf",
        username: "Marie!",
        password: "12345678",
      }).success,
    ).toBe(false);
  });
});

describe("completeProfileSchema", () => {
  it("valide le pseudo seul", () => {
    expect(completeProfileSchema.safeParse({ username: "ti_doudou" }).success).toBe(
      true,
    );
    expect(completeProfileSchema.safeParse({ username: "X" }).success).toBe(
      false,
    );
  });
});
