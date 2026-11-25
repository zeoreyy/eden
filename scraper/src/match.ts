/**
 * TMDB matching. Conservative on purpose: a wrong match shows wrong ratings, which is worse than none.
 * A candidate must match a title exactly (normalised; PT or original), and agree on year (±1) / director
 * when we know them. Without year or director we only accept recent films. Manual fixes: data/overrides.json.
 */
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { JsonCache } from "./cache.ts";
import { politeFetch } from "./http.ts";
import type { FilmGroup } from "./normalize.ts";
import { mode } from "./normalize.ts";
import { fuzzyEqual, normTitle, searchTitle, sameTitle, titleParts } from "./titles.ts";
import { addDays, squash } from "./util.ts";

const LATIN_NAME = /^[\p{Script=Latin}\p{P}\s.]+$/u;

export interface TmdbFilm {
  id: number;
  /** pt-PT title (TMDB falls back to the original when no translation). */
  title: string;
  originalTitle: string;
  originalLanguage: string;
  releaseDate?: string;
  year?: number;
  runtime?: number;
  posterPath?: string;
  imdbId?: string;
  directors: string[];
}

export interface SearchHit { id: number; title: string; originalTitle: string; releaseDate?: string; popularity: number }

export interface TmdbApi {
  search(query: string, year?: number): Promise<SearchHit[]>;
  details(id: number): Promise<TmdbFilm>;
}

export type Tier = "exact" | "part" | "fuzzy" | "director";
export interface Match { film: TmdbFilm; how: string }
/** A match, or the near-miss candidate ids (similar title, not verified) for the cross-cinema second pass. */
export interface MatchResult { match: Match | null; nearIds: number[] }

/** What we know about a film from the cinemas. */
export interface MatchInput {
  keys: string[];
  /** Titles to search with, best first (originals first: TMDB knows them best). */
  queries: string[];
  partKeys: string[];
  year?: number;
  runtime?: number;
  directors: string[];
}

export function matchInput(g: FilmGroup): MatchInput {
  const byCount = (m: Map<string, number>) => [...m].sort((a, b) => b[1] - a[1]).map(([t]) => t);
  const queries: string[] = [];
  const seen = new Set<string>();
  for (const t of [...byCount(g.originals), ...byCount(g.titles)]) {
    const k = normTitle(t);
    if (k && !seen.has(k)) { seen.add(k); queries.push(searchTitle(t)); }
  }
  const partKeys = [...new Set(queries.flatMap(titleParts).map(normTitle))].filter((k) => !g.keys.has(k));
  return { keys: [...g.keys], queries, partKeys, year: g.year, runtime: mode(g.runtimes), directors: g.directors };
}

function surnames(names: string[]): string[] {
  return names
    .flatMap((n) => n.split(/,|&|\s+e\s+|\s+and\s+/i))
    .map((n) => n.trim())
    .filter(Boolean)
    .map((n) => squash(n.split(/\s+/).at(-1)!));
}

/** Any director in common? Compares surnames ("Kulechov" ≈ "Kuleshov", "Wong Kar Wai" ≈ "Wong Kar-wai"). */
export function directorsOverlap(a: string[], b: string[]): boolean {
  const fullB = b.map(squash);
  for (const s of surnames(a)) {
    if (s.length < 3) continue;
    for (const t of surnames(b)) if (s === t || (Math.min(s.length, t.length) >= 5 && levClose(s, t))) return true;
    if (fullB.some((f) => f.endsWith(s))) return true;
  }
  return false;
}

function levClose(a: string, b: string): boolean {
  // one edit apart
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

export function tierOf(hit: Pick<SearchHit, "title" | "originalTitle">, input: MatchInput): Tier | null {
  const hk = [normTitle(hit.title), normTitle(hit.originalTitle)];
  if (hk.some((k) => input.keys.some((x) => sameTitle(k, x)))) return "exact";
  if (hk.some((k) => input.partKeys.some((x) => sameTitle(k, x)))) return "part";
  if (hk.some((k) => input.keys.some((x) => fuzzyEqual(k, x)))) return "fuzzy";
  return null;
}

/** Released within the last 3 years or due within a year (i.e. plausibly a current release). */
function recent(f: TmdbFilm, today: string): boolean {
  return !!f.releaseDate && f.releaseDate >= addDays(today, -3 * 365) && f.releaseDate <= addDays(today, 365);
}

function withinYear(f: TmdbFilm, today: string): boolean {
  return !!f.releaseDate && f.releaseDate >= addDays(today, -365) && f.releaseDate <= addDays(today, 365);
}

export function verify(input: MatchInput, f: TmdbFilm, tier: Tier, today: string): boolean {
  const yearOk = input.year && f.year ? Math.abs(f.year - input.year) <= 1 : undefined;
  // TMDB sometimes stores names in their own script ("Андрей Тарковский"): then a mismatch proves nothing.
  const dirOk = input.directors.length && f.directors.length
    ? directorsOverlap(input.directors, f.directors) || (f.directors.some((d) => !LATIN_NAME.test(d)) ? undefined : false)
    : undefined;
  const rtOk = input.runtime && f.runtime ? Math.abs(f.runtime - input.runtime) <= 15 : undefined;
  if (yearOk === false || dirOk === false) return false;
  switch (tier) {
    case "exact":
      return !!(yearOk || dirOk) || (recent(f, today) && rtOk !== false);
    case "part":
      return dirOk === true || (yearOk === true && rtOk !== false);
    case "fuzzy":
      return dirOk === true && (yearOk === true || recent(f, today));
    case "director":
      // No title in common (TMDB only knows "Ojczyzna" for Pawlikowski's Fatherland): director + year + runtime.
      return dirOk === true && rtOk !== false && (yearOk === true || (!input.year && withinYear(f, today)));
  }
}

const TIER_RANK: Record<Tier, number> = { exact: 0, part: 1, fuzzy: 2, director: 3 };

export async function findMatch(input: MatchInput, api: TmdbApi, today: string): Promise<MatchResult> {
  const cands = new Map<number, SearchHit & { tier: Tier }>();
  const queries = [...input.queries, ...input.partKeys.length ? input.queries.flatMap(titleParts) : []].slice(0, 5);
  for (const q of queries) {
    const hits = [...(input.year ? (await api.search(q, input.year)).slice(0, 10) : []), ...(await api.search(q)).slice(0, 10)];
    for (const h of hits) {
      const tier = tierOf(h, input) ?? (input.directors.length ? "director" : null);
      if (tier && !cands.has(h.id)) cands.set(h.id, { ...h, tier });
    }
    if ([...cands.values()].some((c) => c.tier === "exact")) break;
  }
  // Director-only candidates must at least be from the right year (or recent), to keep detail lookups few.
  for (const [id, c] of cands) {
    const y = c.releaseDate ? Number(c.releaseDate.slice(0, 4)) : undefined;
    const ok = input.year ? y != null && Math.abs(y - input.year) <= 1 : !!c.releaseDate && Math.abs(Date.parse(c.releaseDate) - Date.parse(today)) <= 365 * 86_400_000;
    if (c.tier === "director" && !ok) cands.delete(id);
  }
  const t = Date.parse(today);
  const dist = (c: SearchHit) => {
    if (!c.releaseDate) return Infinity;
    return input.year ? Math.abs(Number(c.releaseDate.slice(0, 4)) - input.year) * 365 : Math.abs(Date.parse(c.releaseDate) - t) / 86_400_000;
  };
  const ranked = [...cands.values()].sort(
    (a, b) => TIER_RANK[a.tier] - TIER_RANK[b.tier] || dist(a) - dist(b) || b.popularity - a.popularity,
  );
  const titled = ranked.filter((c) => c.tier !== "director").slice(0, 5);
  const byDirector = ranked.filter((c) => c.tier === "director").slice(0, 3);
  for (const c of [...titled, ...byDirector]) {
    const f = await api.details(c.id);
    if (verify(input, f, c.tier, today)) return { match: { film: f, how: c.tier }, nearIds: [] };
  }
  return { match: null, nearIds: titled.map((c) => c.id) };
}

// ── TMDB client ────────────────────────────────────────────────────────────────

export function tmdbClient(key: string): TmdbApi {
  const base = "https://api.themoviedb.org/3";
  const bearer = key.startsWith("eyJ"); // v4 read token vs v3 api key — both come from the same TMDB settings page
  const get = async (path: string, params: Record<string, string>) => {
    const q = new URLSearchParams({ ...params, ...(bearer ? {} : { api_key: key }) });
    const res = await politeFetch(`${base}${path}?${q}`, bearer ? { headers: { Authorization: `Bearer ${key}` } } : {});
    return res.json() as Promise<any>;
  };
  return {
    async search(query, year) {
      const p: Record<string, string> = { query, language: "pt-PT", include_adult: "false" };
      if (year) p.year = String(year);
      const r = await get("/search/movie", p);
      return (r.results as any[]).map((x) => ({
        id: x.id, title: x.title ?? "", originalTitle: x.original_title ?? "", releaseDate: x.release_date || undefined, popularity: x.popularity ?? 0,
      }));
    },
    async details(id) {
      const x = await get(`/movie/${id}`, { language: "pt-PT", append_to_response: "external_ids,credits" });
      return {
        id: x.id, title: x.title, originalTitle: x.original_title, originalLanguage: x.original_language,
        releaseDate: x.release_date || undefined, year: x.release_date ? Number(x.release_date.slice(0, 4)) : undefined,
        runtime: x.runtime || undefined, posterPath: x.poster_path || undefined,
        imdbId: x.external_ids?.imdb_id || x.imdb_id || undefined,
        directors: ((x.credits?.crew ?? []) as any[]).filter((c) => c.job === "Director").map((c) => c.name),
      };
    },
  };
}

/** Wraps the API with the file cache: details for 30 days. */
export function cachedApi(api: TmdbApi, cache: JsonCache<TmdbFilm>): TmdbApi {
  return {
    search: (q, y) => api.search(q, y),
    async details(id) {
      const hit = cache.get(String(id), 30);
      if (hit) return hit;
      const f = await api.details(id);
      cache.set(String(id), f);
      return f;
    },
  };
}

// ── Overrides + matcher with decision cache ────────────────────────────────────

export const OVERRIDES_FILE = fileURLToPath(new URL("../../data/overrides.json", import.meta.url));

/** normalised title → TMDB id, or null to force "no match". */
export function loadOverrides(file = OVERRIDES_FILE): Record<string, number | null> {
  if (!existsSync(file)) return {};
  return JSON.parse(readFileSync(file, "utf8")).tmdb ?? {};
}

export interface Matcher {
  match(g: FilmGroup): Promise<MatchResult>;
  /** Details for an id (second pass: adopt a near-miss that another cinema's listing matched). */
  details(id: number): Promise<TmdbFilm>;
  save(): void;
}

/** Decisions cached per film signature: matches 30 days, "no match" 3 days (TMDB gets new entries). */
export function tmdbMatcher(key: string, today: string, overrides = loadOverrides()): Matcher {
  const films = JsonCache.open<TmdbFilm>("tmdb-films");
  const decisions = JsonCache.open<{ id: number | null; how: string; nearIds?: number[] }>("tmdb-matches");
  const api = cachedApi(tmdbClient(key), films);
  return {
    async match(g) {
      const input = matchInput(g);
      for (const k of input.keys) {
        if (k in overrides) {
          const id = overrides[k];
          return { match: id == null ? null : { film: await api.details(id), how: "override" }, nearIds: [] };
        }
      }
      const sig = [...input.keys].sort().join("|") + `|${input.year ?? ""}`;
      const cached = decisions.get(sig, 30);
      if (cached?.id) return { match: { film: await api.details(cached.id), how: cached.how }, nearIds: [] };
      if (cached && decisions.get(sig, 3)) return { match: null, nearIds: cached.nearIds ?? [] };
      const r = await findMatch(input, api, today);
      decisions.set(sig, { id: r.match?.film.id ?? null, how: r.match?.how ?? "none", nearIds: r.nearIds });
      return r;
    },
    details: (id) => api.details(id),
    save() {
      films.save();
      decisions.save();
    },
  };
}

/** No key yet: everything stays unmatched (programme still builds). */
export const noMatcher: Matcher = {
  match: async () => ({ match: null, nearIds: [] }),
  details: async () => { throw new Error("no TMDB key"); },
  save() {},
};
