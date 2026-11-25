/** Source results → one Programme: validate, group films, match, rate, carry over failed sources, top picks. */
import { CINEMAS, cinemasForSource } from "@eden/shared";
import type { Film, Programme, Session, SourceId, SourceStatus } from "@eden/shared";
import type { Match, Matcher } from "./match.ts";
import { groupFilms, mode, newGroup, sessionId, wallClock, type FilmGroup } from "./normalize.ts";
import type { RatingsSource } from "./ratings.ts";
import { fuzzyEqual, isAllCaps, normTitle, sameTitle, slug, titleCase } from "./titles.ts";
import { topPicks } from "./toppicks.ts";
import type { RawSession, SourceResult } from "./types.ts";
import { lisbonToday } from "./util.ts";
import { validateSource } from "./validate.ts";

export const ALL_SOURCES = [...new Set(CINEMAS.map((c) => c.source))] as SourceId[];

export interface BuildInput {
  /** Missing source = not run this time (e.g. `--only`): its previous data and status are kept as they were. */
  results: Partial<Record<SourceId, SourceResult | Error>>;
  previous?: Programme;
  matcher: Matcher;
  ratings: RatingsSource;
  now?: Date;
}

export interface FilmRow {
  film: Film;
  how: string;
  sessions: number;
  cinemas: number;
  titles: string[];
}

export interface BuildReport {
  rows: FilmRow[];
  warnings: string[];
}

const LATIN = /^[\p{Script=Latin}\p{N}\p{P}\p{S}\p{Zs}\p{M}]+$/u;
const byCount = (m: Map<string, number>) => [...m].sort((a, b) => b[1] - a[1]).map(([t]) => t);

/** As published by the cinemas: the mixed-case variant most sessions use; TMDB casing only to fix ALL CAPS. */
export function chooseTitle(g: FilmGroup, m: Match | null): string {
  const variants = byCount(g.titles);
  const mixed = variants.find((t) => !isAllCaps(t));
  if (mixed) return mixed;
  if (m && variants.some((v) => normTitle(v) === normTitle(m.film.title))) return m.film.title;
  return titleCase(variants[0]!);
}

export function chooseOriginal(g: FilmGroup, m: Match | null, title: string): string | undefined {
  let o: string | undefined;
  if (m && LATIN.test(m.film.originalTitle)) o = isAllCaps(m.film.originalTitle) ? titleCase(m.film.originalTitle) : m.film.originalTitle;
  else {
    const src = byCount(g.originals)[0];
    o = src && isAllCaps(src) ? titleCase(src) : src;
  }
  return o && !sameTitle(normTitle(o), normTitle(title)) ? o : undefined;
}

/** One short label (spec): "Correspondências - Rita Azevedo Gomes | Realizadora Convidada" → first part. */
export function shortLabel(label: string): string {
  return label.split(" | ")[0]!.trim();
}

/** The cinema's own film page, preferring the arthouse sites (they describe the film best). */
const PAGE_PREFERENCE = ["nimas", "cinemateca", "saojorge", "fernandolopes", "ideal", "nos", "cinemacity", "uci"];
export function filmPage(g: FilmGroup): string | undefined {
  const withPage = g.sessions.filter((s) => s.film.filmUrl?.startsWith("https://"));
  withPage.sort((a, b) => PAGE_PREFERENCE.indexOf(a.source) - PAGE_PREFERENCE.indexOf(b.source));
  return withPage[0]?.film.filmUrl;
}

function merge(groups: FilmGroup[]): FilmGroup {
  return newGroup(groups.flatMap((g) => g.sessions));
}

export async function buildProgramme(inp: BuildInput): Promise<{ programme: Programme; report: BuildReport }> {
  const now = inp.now ?? new Date();
  const nowIso = now.toISOString();
  const today = lisbonToday(now);
  const prev = inp.previous;
  const warnings: string[] = [];

  // 1. Validate each source; failures (and sources not run) carry their last good sessions.
  const raws: RawSession[] = [];
  const carried: Session[] = [];
  const sources = {} as Record<SourceId, SourceStatus>;
  for (const id of ALL_SOURCES) {
    const cinemaIds = cinemasForSource(id).map((c) => c.id);
    const prevSessions = (prev?.sessions ?? []).filter((s) => cinemaIds.includes(s.cinemaId) && s.programmeDate >= today);
    const prevStatus = prev?.sources[id];
    const r = inp.results[id];
    if (!r) {
      carried.push(...prevSessions);
      sources[id] = prevStatus ?? { cinemaIds, lastSuccess: null, lastAttempt: nowIso, ok: false, note: "not run yet" };
      continue;
    }
    if (!(r instanceof Error)) warnings.push(...r.warnings.map((w) => `${id}: ${w}`));
    const v = r instanceof Error
      ? { ok: false, sessions: [], note: r.message.split("\n")[0]!.slice(0, 200) }
      : validateSource(r, today, prevSessions.length);
    if (v.ok) {
      raws.push(...v.sessions);
      sources[id] = { cinemaIds, lastSuccess: nowIso, lastAttempt: nowIso, ok: true, ...(v.note ? { note: v.note } : {}) };
    } else {
      carried.push(...prevSessions);
      const failures = (prevStatus?.failures ?? (prevStatus && !prevStatus.ok ? 1 : 0)) + 1;
      sources[id] = { cinemaIds, lastSuccess: prevStatus?.lastSuccess ?? null, lastAttempt: nowIso, ok: false, note: v.note, failures };
      warnings.push(`${id}: FAILED — ${v.note}; kept ${prevSessions.length} sessions from the last good run`);
    }
  }

  // 2. Group by title, 3. match on TMDB.
  let groups = groupFilms(raws);
  const matches = new Map<FilmGroup, Match | null>();
  const near = new Map<FilmGroup, number[]>();
  for (const g of groups) {
    try {
      const r = await inp.matcher.match(g);
      matches.set(g, r.match);
      near.set(g, r.nearIds);
    } catch (e) {
      matches.set(g, null);
      warnings.push(`tmdb: ${byCount(g.titles)[0]}: ${(e as Error).message}`);
    }
  }
  // Second pass: a near-miss is accepted when another cinema's listing of the film was verified as that id
  // (Cinema City "DUNE PARTE TRES" ↔ NOS "Dune - Duna: Parte Três").
  const matchedIds = new Set([...matches.values()].flatMap((m) => (m ? [m.film.id] : [])));
  for (const g of groups) {
    const id = matches.get(g) ? undefined : near.get(g)?.find((n) => matchedIds.has(n));
    if (id) matches.set(g, { film: await inp.matcher.details(id), how: "cross-cinema" });
  }

  // 4. Merge groups that are the same TMDB film, then unmatched ones whose title is near-identical to another film.
  const byId = new Map<number, FilmGroup[]>();
  const unmatched: FilmGroup[] = [];
  for (const g of groups) {
    const m = matches.get(g);
    if (m) byId.set(m.film.id, [...(byId.get(m.film.id) ?? []), g]);
    else unmatched.push(g);
  }
  const final: { g: FilmGroup; m: Match | null }[] = [];
  for (const gs of byId.values()) {
    const m = matches.get(gs[0]!)!;
    const g = gs.length > 1 ? merge(gs) : gs[0]!;
    final.push({ g, m: gs.length > 1 ? { ...m, how: [...new Set(gs.map((x) => matches.get(x)!.how))].join("+") } : m });
  }
  for (const u of unmatched) {
    const target = final.find(({ g, m }) => {
      const keys = [...g.keys, ...(m ? [normTitle(m.film.title), normTitle(m.film.originalTitle)] : [])];
      return [...u.keys].some((k) => keys.some((x) => fuzzyEqual(k, x)));
    });
    if (target) target.g = merge([target.g, u]);
    else final.push({ g: u, m: null });
  }
  groups = final.map((f) => f.g);

  // 5. Films + sessions.
  const films: Film[] = [];
  const sessions = new Map<string, Session>();
  const rows: FilmRow[] = [];
  const usedKeys = new Set<string>();
  const keyOfNos = new Map<string, string>();
  for (const { g, m } of final) {
    const title = chooseTitle(g, m);
    const year = m?.film.year ?? g.year;
    let key = m ? `tmdb-${m.film.id}` : `t-${slug(normTitle(title))}${year ? `-${year}` : ""}`;
    for (let i = 2; usedKeys.has(key); i++) key = `${key.replace(/~\d+$/, "")}~${i}`;
    usedKeys.add(key);
    const f: Film = { key, title };
    const original = chooseOriginal(g, m, title);
    if (original) f.originalTitle = original;
    if (year) f.year = year;
    const runtime = mode(g.runtimes) ?? m?.film.runtime;
    if (runtime) f.runtimeMin = runtime;
    const poster = m?.film.posterPath ? `https://image.tmdb.org/t/p/w342${m.film.posterPath}` : g.posters[0];
    if (poster) f.posterUrl = poster;
    const page = filmPage(g);
    if (page) f.pageUrl = page;
    if (m) {
      f.tmdbId = m.film.id;
      f.letterboxdUrl = `https://letterboxd.com/tmdb/${m.film.id}/`;
      if (m.film.imdbId) {
        f.imdbId = m.film.imdbId;
        try {
          const { imdb } = await inp.ratings.get(m.film.imdbId);
          if (imdb) f.imdb = imdb;
        } catch (e) {
          warnings.push(`omdb: ${title}: ${(e as Error).message}`);
        }
      }
    }
    films.push(f);
    for (const id of g.nosIds) keyOfNos.set(id, key);
    for (const raw of g.sessions) {
      const wc = wallClock(raw);
      const s: Session = {
        id: sessionId(raw, wc.startsAt), filmKey: key, cinemaId: raw.cinemaId, startsAt: wc.startsAt, programmeDate: wc.programmeDate,
        ...(raw.room ? { room: raw.room } : {}), ...(raw.label ? { label: shortLabel(raw.label) } : {}), url: raw.url, urlKind: raw.urlKind,
      };
      sessions.set(s.id, s);
    }
    rows.push({
      film: f, how: m?.how ?? "—", sessions: g.sessions.length, cinemas: new Set(g.sessions.map((s) => s.cinemaId)).size,
      titles: byCount(g.titles),
    });
  }

  // 6. Carried-over sessions keep their films from the previous programme.
  const filmKeys = new Set(films.map((f) => f.key));
  for (const s of carried) {
    sessions.set(s.id, s);
    if (!filmKeys.has(s.filmKey)) {
      const pf = prev?.films.find((f) => f.key === s.filmKey);
      if (pf) { films.push(pf); filmKeys.add(pf.key); }
    }
  }

  // 7. Top picks from NOS's featured list (when NOS ran fine) + evening cross-cinema count.
  const nos = inp.results.nos;
  const featuredRaw = nos && !(nos instanceof Error) && sources.nos.ok
    ? ((nos.extras?.topMovies ?? []) as { position: number; aggregate: string }[])
    : [];
  const featured = featuredRaw
    .slice()
    .sort((a, b) => a.position - b.position)
    .flatMap((t) => keyOfNos.get(t.aggregate) ?? []);
  const allSessions = [...sessions.values()].sort((a, b) => a.startsAt.localeCompare(b.startsAt) || a.cinemaId.localeCompare(b.cinemaId));

  const programme: Programme = {
    generatedAt: nowIso,
    films: films.sort((a, b) => a.title.localeCompare(b.title, "pt")),
    sessions: allSessions,
    topPicks: topPicks(allSessions, featured),
    sources,
  };
  return { programme, report: { rows, warnings } };
}
