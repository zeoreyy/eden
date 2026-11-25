/** IMDb rating via OMDb (free key, 1,000/day), cached per film for 7 days. Missing = not shown. (No RT: decision #24.) */
import { JsonCache } from "./cache.ts";
import { politeFetch } from "./http.ts";

export interface Ratings { imdb?: number }

/** OMDb response → IMDb rating. "N/A" is simply absent. */
export function parseOmdb(x: any): Ratings {
  if (x?.Response !== "True") return {};
  const imdb = Number(x.imdbRating);
  return Number.isFinite(imdb) && imdb > 0 ? { imdb } : {};
}

export interface RatingsSource {
  get(imdbId: string): Promise<Ratings>;
  save(): void;
  /** API calls made this run (OMDb free limit: 1,000/day). */
  calls: number;
}

export function omdbRatings(key: string): RatingsSource {
  const cache = JsonCache.open<Ratings>("omdb");
  const src: RatingsSource = {
    calls: 0,
    async get(imdbId) {
      const hit = cache.get(imdbId, 7);
      if (hit) return hit;
      try {
        src.calls++;
        const res = await politeFetch(`https://www.omdbapi.com/?i=${encodeURIComponent(imdbId)}&apikey=${encodeURIComponent(key)}`);
        const x = (await res.json()) as any;
        if (x?.Response === "False" && /limit/i.test(x.Error ?? "")) throw new Error(`OMDb: ${x.Error}`);
        const r = parseOmdb(x);
        cache.set(imdbId, r);
        return r;
      } catch (e) {
        // Keep the last known ratings rather than dropping them.
        const old = cache.stale(imdbId);
        if (old) return old;
        throw e;
      }
    },
    save: () => cache.save(),
  };
  return src;
}

export const noRatings: RatingsSource = { calls: 0, get: async () => ({}), save() {} };
