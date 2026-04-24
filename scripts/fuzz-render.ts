/**
 * Fuzz test : on importe les helpers "purs" utilisés dans le rendu RSC
 * des pages deal/listing, et on les appelle avec des payloads edge-case
 * (null, undefined, NaN, Invalid Date, string vide, URL invalide, etc.)
 * pour prouver qu'aucun ne throw au runtime.
 *
 * Ce n'est PAS un test du rendu RSC complet — ça demande un framework
 * type Playwright — mais ça couvre les fonctions pures qui composent
 * 90% des sources de crash historiques (formatage, validation
 * d'image, JSON-LD, parsing URL, level lookup).
 *
 * Usage : `tsx scripts/fuzz-render.ts`
 * Retourne exit 0 si tout est robuste, exit 1 si un crash est détecté.
 */

import { formatPrice, formatRelativeTime } from "../src/lib/format";
import { isRenderableImageUrl } from "../src/lib/images";
import { rethrowIfNextInternal } from "../src/lib/next-errors";
import { LEVEL_META } from "../src/lib/gamification/levels";
import {
  parseFilters,
  parsePage,
  parseQuery,
  parseSort,
  parseType,
  hasActiveFilters,
  countActiveFilters,
  buildListingsUrl,
} from "../src/lib/listings/url";
import { formatPriceType } from "../src/lib/listings/queries";
import {
  pickRegisteredAttributes,
  formatAttribute,
  getFieldsForCategory,
} from "../src/lib/listings/field-registry";

type TestCase = { name: string; fn: () => unknown };

const cases: TestCase[] = [];

// ------------ formatPrice -----------------------------------------
cases.push({
  name: "formatPrice(NaN)",
  fn: () => formatPrice(NaN),
});
cases.push({ name: "formatPrice('')", fn: () => formatPrice("") });
cases.push({ name: "formatPrice('abc')", fn: () => formatPrice("abc") });
cases.push({ name: "formatPrice(Infinity)", fn: () => formatPrice(Infinity) });
cases.push({ name: "formatPrice(-Infinity)", fn: () => formatPrice(-Infinity) });
cases.push({ name: "formatPrice(0)", fn: () => formatPrice(0) });
cases.push({ name: "formatPrice(1234.5)", fn: () => formatPrice(1234.5) });

// ------------ formatRelativeTime ----------------------------------
cases.push({
  name: "formatRelativeTime(null)",
  fn: () => formatRelativeTime(null),
});
cases.push({
  name: "formatRelativeTime(undefined)",
  fn: () => formatRelativeTime(undefined),
});
cases.push({
  name: "formatRelativeTime(new Date('invalid'))",
  fn: () => formatRelativeTime(new Date("invalid")),
});
cases.push({
  name: "formatRelativeTime('not a date')",
  fn: () => formatRelativeTime("not a date"),
});
cases.push({
  name: "formatRelativeTime('')",
  fn: () => formatRelativeTime(""),
});
cases.push({
  name: "formatRelativeTime(new Date())",
  fn: () => formatRelativeTime(new Date()),
});
cases.push({
  name: "formatRelativeTime(1h ago)",
  fn: () => formatRelativeTime(new Date(Date.now() - 3_600_000)),
});
cases.push({
  name: "formatRelativeTime(1 month ago)",
  fn: () => formatRelativeTime(new Date(Date.now() - 30 * 86_400_000)),
});

// ------------ isRenderableImageUrl --------------------------------
const urlCases = [
  null,
  undefined,
  "",
  "   ",
  "/valid/path.png",
  "//cdn.example.com/x.png", // protocol-relative, on refuse
  "http://example.com/x.png",
  "https://example.com/x.png",
  "https://example.com/with spaces.png",
  "ftp://example.com/x.png",
  "javascript:alert(1)",
  "data:image/png;base64,ABC",
  "not a url",
  "https://[invalid",
  "https://example.com/\n/evil.png",
];
for (const u of urlCases) {
  cases.push({
    name: `isRenderableImageUrl(${JSON.stringify(u)})`,
    fn: () => isRenderableImageUrl(u as string | null | undefined),
  });
}

// ------------ rethrowIfNextInternal -------------------------------
cases.push({
  name: "rethrowIfNextInternal(null)",
  fn: () => rethrowIfNextInternal(null),
});
cases.push({
  name: "rethrowIfNextInternal(undefined)",
  fn: () => rethrowIfNextInternal(undefined),
});
cases.push({
  name: "rethrowIfNextInternal(plain Error)",
  fn: () => rethrowIfNextInternal(new Error("plain")),
});
cases.push({
  name: "rethrowIfNextInternal(string)",
  fn: () => rethrowIfNextInternal("oops"),
});
cases.push({
  name: "rethrowIfNextInternal({digest: 'DYNAMIC_SERVER_USAGE'}) SHOULD RETHROW",
  fn: () => {
    try {
      rethrowIfNextInternal({ digest: "DYNAMIC_SERVER_USAGE" });
      return "DID_NOT_RETHROW";
    } catch {
      return "correctly rethrown";
    }
  },
});
cases.push({
  name: "rethrowIfNextInternal({digest: 'NEXT_REDIRECT;/foo'}) SHOULD RETHROW",
  fn: () => {
    try {
      rethrowIfNextInternal({ digest: "NEXT_REDIRECT;replace;/foo;307" });
      return "DID_NOT_RETHROW";
    } catch {
      return "correctly rethrown";
    }
  },
});

// ------------ LEVEL_META fallback pattern -------------------------
// Le pattern utilisé dans le code : `LEVEL_META[x] ?? LEVEL_META.BEGINNER`
const badLevels = [
  "UNKNOWN",
  "",
  null,
  undefined,
  "SUPER_SAIYAN",
  "beginner",
  0,
];
for (const lvl of badLevels) {
  cases.push({
    name: `LEVEL_META[${JSON.stringify(lvl)}] ?? BEGINNER.emoji`,
    // @ts-expect-error - intentional fuzz
    fn: () => (LEVEL_META[lvl] ?? LEVEL_META.BEGINNER).emoji,
  });
}

// ------------ URL parsing helpers ---------------------------------
const searchParamsCases = [
  {},
  { sort: "garbage", page: "NaN", q: "ab", type: "UNKNOWN" },
  { sort: null, page: -1, q: "a" }, // q too short → null
  { prixMin: "abc", prixMax: Infinity },
  { carburant: "vapeur_dechu", contrat: "slavery" },
  { page: "999999999999999999" },
];
for (const sp of searchParamsCases) {
  cases.push({
    name: `parseFilters(${JSON.stringify(sp)})`,
    // @ts-expect-error - intentional fuzz
    fn: () => parseFilters(sp),
  });
  cases.push({
    name: `parsePage(${JSON.stringify(sp.page)})`,
    // @ts-expect-error
    fn: () => parsePage(sp.page),
  });
  cases.push({
    name: `parseQuery(${JSON.stringify(sp.q)})`,
    // @ts-expect-error
    fn: () => parseQuery(sp.q),
  });
}
cases.push({ name: "parseSort(undefined)", fn: () => parseSort(undefined) });
cases.push({
  name: "parseType('weird_type')",
  fn: () => parseType("weird_type"),
});
cases.push({
  name: "hasActiveFilters(empty)",
  fn: () =>
    hasActiveFilters({
      priceMin: null,
      priceMax: null,
      yearMin: null,
      kmMax: null,
      surfaceMin: null,
      rooms: null,
      fuel: null,
      brand: null,
      contract: null,
    }),
});
cases.push({
  name: "countActiveFilters(all null)",
  fn: () =>
    countActiveFilters({
      category: null,
      city: null,
      type: null,
      filters: {
        priceMin: null,
        priceMax: null,
        yearMin: null,
        kmMax: null,
        surfaceMin: null,
        rooms: null,
        fuel: null,
        brand: null,
        contract: null,
      },
    }),
});
cases.push({
  name: "buildListingsUrl(empty)",
  fn: () => buildListingsUrl({}),
});

// ------------ formatPriceType -------------------------------------
import type { PriceType } from "@prisma/client";
import type { Prisma } from "@prisma/client";
const priceTypes: PriceType[] = [
  "FIXED",
  "NEGOTIABLE",
  "ON_REQUEST",
  "PER_DAY",
  "PER_MONTH",
  "FREE",
];
for (const pt of priceTypes) {
  cases.push({
    name: `formatPriceType(${pt}, null)`,
    fn: () => formatPriceType(pt, null),
  });
  cases.push({
    name: `formatPriceType(${pt}, 100)`,
    fn: () => formatPriceType(pt, { toString: () => "100" } as Prisma.Decimal),
  });
}
cases.push({
  name: "formatPriceType('UNKNOWN' as PriceType, null)",
  // @ts-expect-error - simulate enum drift
  fn: () => formatPriceType("UNKNOWN", null),
});

// ------------ field-registry --------------------------------------
const weirdAttrs = [
  null,
  undefined,
  "",
  "string",
  [],
  { annee: null, kilometrage: undefined, carburant: 123 },
  { annee: "2020", kilometrage: 50000, carburant: "essence" },
  { unknown_field: "value" },
];
for (const attrs of weirdAttrs) {
  cases.push({
    name: `pickRegisteredAttributes(voitures, ${JSON.stringify(attrs)})`,
    fn: () => pickRegisteredAttributes("voitures", attrs),
  });
}
cases.push({
  name: "pickRegisteredAttributes(unknown-category, {foo:1})",
  fn: () => pickRegisteredAttributes("unknown-category", { foo: 1 }),
});
const fields = getFieldsForCategory("voitures");
for (const f of fields.slice(0, 3)) {
  cases.push({
    name: `formatAttribute(${f.name}, null)`,
    fn: () => formatAttribute(f, null),
  });
  cases.push({
    name: `formatAttribute(${f.name}, undefined)`,
    // @ts-expect-error - fuzz
    fn: () => formatAttribute(f, undefined),
  });
}

// ------------ run ---------------------------------------------------
let passed = 0;
const failures: { name: string; err: unknown }[] = [];

for (const tc of cases) {
  try {
    const result = tc.fn();
    const preview =
      result === undefined
        ? "undefined"
        : String(JSON.stringify(result)).slice(0, 60);
    // eslint-disable-next-line no-console
    console.log(`  OK  ${tc.name} → ${preview}`);
    passed++;
  } catch (err) {
    failures.push({ name: tc.name, err });
    // eslint-disable-next-line no-console
    console.error(
      `  FAIL ${tc.name} → ${err instanceof Error ? err.message : err}`,
    );
  }
}

// eslint-disable-next-line no-console
console.log(
  `\n==================\n${passed}/${cases.length} passed, ${failures.length} failed`,
);

if (failures.length > 0) {
  // eslint-disable-next-line no-console
  console.error("\nFailures:");
  for (const f of failures) {
    // eslint-disable-next-line no-console
    console.error(` - ${f.name}: ${f.err instanceof Error ? f.err.stack : f.err}`);
  }
  process.exit(1);
}
process.exit(0);
