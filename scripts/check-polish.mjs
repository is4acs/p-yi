// Read-only SSR smoke checks. Start the application before running this script.
// Usage: node scripts/check-polish.mjs http://localhost:3100
import assert from "node:assert/strict";

const base = new URL(process.argv[2] ?? "http://localhost:3100");
assert.ok(["http:", "https:"].includes(base.protocol), "Expected an HTTP(S) URL");

function attributes(tag) {
  return Object.fromEntries(
    [...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, name, value]) => [name, value]),
  );
}

function findTag(html, name, predicate) {
  return [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, "g"))]
    .map(([tag]) => attributes(tag))
    .find(predicate);
}

const cases = [
  { path: "/", action: "/recherche", filters: {}, noindex: false },
  {
    path: "/bons-plans?sort=new&city=cayenne&category=supermarche-alimentation&q=riz",
    action: "/bons-plans",
    filters: { sort: "new", city: "cayenne", category: "supermarche-alimentation" },
    noindex: true,
  },
  {
    path: "/annonces?sort=price-asc&city=cayenne&type=offer&prixMax=2000&q=table",
    action: "/annonces",
    filters: { sort: "price-asc", city: "cayenne", type: "offer", prixMax: "2000" },
    noindex: true,
  },
];

for (const test of cases) {
  const response = await fetch(new URL(test.path, base), {
    signal: AbortSignal.timeout(30_000),
    redirect: "manual",
  });
  assert.equal(response.status, 200, `${test.path}: HTTP ${response.status}`);
  const html = await response.text();
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1, `${test.path}: expected one H1`);
  assert.match(html, /<title>[^<]+<\/title>/, "Missing title");
  assert.ok(findTag(html, "meta", (tag) => tag.name === "description" && tag.content), "Missing description");
  const canonical = findTag(html, "link", (tag) => tag.rel === "canonical");
  assert.ok(canonical?.href, "Missing canonical");
  assert.equal(new URL(canonical.href).search, "", "Canonical must not contain filters");
  if (test.noindex) {
    assert.ok(findTag(html, "meta", (tag) => tag.name === "robots" && /\bnoindex\b/.test(tag.content)), "Filtered page must be noindex");
  }

  const form = [...html.matchAll(/<form\b([^>]*)>([\s\S]*?)<\/form>/g)]
    .find(([, opening]) => attributes(opening).action === test.action);
  assert.ok(form, `Missing search form for ${test.action}`);
  assert.equal(attributes(form[1]).method?.toLowerCase(), "get", "Search must use GET");
  assert.ok(findTag(form[2], "input", (tag) => tag.name === "q" && tag.type === "search"), "Missing search field");
  assert.ok(findTag(form[2], "button", (tag) => tag.type === "submit" && tag["aria-label"]), "Missing labelled submit button");
  for (const [name, value] of Object.entries(test.filters)) {
    assert.ok(findTag(form[2], "input", (tag) => tag.type === "hidden" && tag.name === name && tag.value === value), `Lost filter: ${name}`);
  }
  if (test.path === "/") {
    for (const city of ["guyane", "cayenne", "kourou", "matoury", "remire-montjoly", "saint-laurent-du-maroni"]) {
      assert.ok(findTag(html, "a", (tag) => tag.href === `/bons-plans/${city}`), `Missing city link: ${city}`);
    }
  }
  console.log(`PASS ${test.path}`);
}
