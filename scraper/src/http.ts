/** Polite fetch: honest User-Agent, spaced requests per host, simple retry. */
export const USER_AGENT = "eden-lisboa/1.0 (+https://github.com/zeoreyy/eden)";

/** Cinema sites get 800 ms between requests; the film-data APIs allow faster (TMDB ~40 req/s, OMDb no stated rate). */
const GAP_MS: Record<string, number> = { "api.themoviedb.org": 120, "www.omdbapi.com": 150 };
const DEFAULT_GAP_MS = 800;
const last = new Map<string, number>();

/** Never print API keys (GitHub Actions logs are public on a public repo). */
export function redact(url: string): string {
  return url.replace(/([?&](?:api_?key)=)[^&]+/gi, "$1***");
}

export async function politeFetch(url: string, init: RequestInit = {}, retries = 2): Promise<Response> {
  const host = new URL(url).host;
  const wait = (last.get(host) ?? 0) + (GAP_MS[host] ?? DEFAULT_GAP_MS) - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  last.set(host, Date.now());
  const res = await fetch(url, { ...init, headers: { "User-Agent": USER_AGENT, ...init.headers } });
  if (!res.ok && retries > 0 && (res.status >= 500 || res.status === 429)) {
    await new Promise((r) => setTimeout(r, res.status === 429 ? 5000 : 1000));
    return politeFetch(url, init, retries - 1);
  }
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${redact(url)}`);
  return res;
}
