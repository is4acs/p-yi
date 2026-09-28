import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");
const origin = "https://www.peyi.gf";

function worker(fetchImpl = async () => new Response("fresh")) {
  const events = {};
  const writes = [];
  const removed = [];
  let precached = [];
  const context = vm.createContext({
    URL, Request, Response, fetch: fetchImpl,
    self: {
      location: { origin },
      addEventListener: (name, callback) => { events[name] = callback; },
      skipWaiting: async () => {},
      clients: { claim: async () => {} },
    },
    caches: {
      open: async () => ({
        match: async () => null,
        put: async (...args) => { writes.push(args); },
        addAll: async (requests) => { precached = requests; },
      }),
      match: async (key) => key === "/offline" ? new Response("anonymous offline") : new Response("stale private HTML"),
      keys: async () => ["peyi-v2-static", "peyi-v2-html", "peyi-v3-static", "peyi-v3-html", "unrelated-cache"],
      delete: async (key) => { removed.push(key); return true; },
    },
  });
  vm.runInContext(source, context);
  return { context, events, writes, removed, precached: () => precached };
}

function request(path, headers = {}, method = "GET") {
  return new Request(new URL(path, origin), { method, headers });
}

test("RSC, API, session requests and non-public assets bypass the worker", () => {
  const { context } = worker();
  const bypass = [
    request("/?_rsc=abc"),
    request("/", { RSC: "1" }),
    request("/", { "Next-Router-State-Tree": "[]" }),
    request("/", { "Next-Router-Prefetch": "1" }),
    request("/", { accept: "text/x-component" }),
    request("/api/me"), request("/auth/callback"), request("/_next/data/build/page.json"),
    request("/profil"), request("/messages"), request("/recherche?q=table"),
    request("/", {}, "POST"), request("/unknown-private-image.png"),
    new Request("https://storage.example/photo.jpg"),
  ];
  for (const value of bypass) assert.equal(context.shouldHandle(value), false, value.url);
  assert.equal(context.shouldHandle(request("/", { accept: "text/html" })), true);
  assert.equal(context.shouldHandle(request("/_next/static/hash.js")), true);
  assert.equal(context.shouldHandle(request("/logos/stores/logo.png")), true);
});

test("HTML is never persisted and changes remain fresh", async () => {
  let version = 0;
  const { context, writes } = worker(async () => new Response(`version ${++version}`));
  assert.equal(await (await context.networkFirst(request("/"))).text(), "version 1");
  assert.equal(await (await context.networkFirst(request("/"))).text(), "version 2");
  assert.equal(writes.length, 0);
});

test("offline navigation never replays cached private HTML", async () => {
  const { context } = worker(async () => { throw new Error("offline"); });
  assert.equal(await (await context.networkFirst(request("/profil"))).text(), "anonymous offline");
});

test("offline precache omits cookies; activation removes only old Peyi caches", async () => {
  const harness = worker();
  let done;
  const event = { waitUntil: (promise) => { done = promise; } };
  harness.events.install(event);
  await done;
  assert.equal(harness.precached().length, 3);
  for (const value of harness.precached()) assert.equal(value.credentials, "omit");
  harness.events.activate(event);
  await done;
  assert.deepEqual(harness.removed, ["peyi-v2-static", "peyi-v2-html"]);
});

test("static caching respects private/no-store and waits for its writes", async () => {
  for (const cacheControl of ["private", "no-store", "public, max-age=31536000, immutable"]) {
    const { context, writes } = worker(async () => new Response("asset", { headers: { "cache-control": cacheControl } }));
    let done;
    const event = { waitUntil: (promise) => { done = promise; } };
    assert.equal(await (await context.staleWhileRevalidate(request("/_next/static/hash.js"), event)).text(), "asset");
    await done;
    assert.equal(writes.length, cacheControl.startsWith("public") ? 1 : 0);
  }
});
