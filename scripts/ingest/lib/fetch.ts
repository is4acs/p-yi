/**
 * HTTP fetch utilisé par les scrapers : timeout, User-Agent honnête,
 * retry exponentiel. Pas de dep externe, juste `fetch` natif Node 20+.
 */

const DEFAULT_UA = "PeyiDealBot/0.1 (+https://peyi.gf; contact: admin@peyi.gf)";

export type FetchOptions = {
  timeoutMs?: number;
  retries?: number;
  headers?: Record<string, string>;
};

export async function fetchText(url: string, opts: FetchOptions = {}): Promise<string> {
  const { timeoutMs = 15_000, retries = 2, headers = {} } = opts;

  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: {
          "User-Agent": DEFAULT_UA,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          ...headers,
        },
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} on ${url}`);
      }
      return await res.text();
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        const wait = 2 ** attempt * 1_000 + Math.floor(Math.random() * 500);
        await new Promise((r) => setTimeout(r, wait));
      }
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(
    `fetchText failed after ${retries + 1} attempts: ${url} — ${String(lastErr)}`,
  );
}
