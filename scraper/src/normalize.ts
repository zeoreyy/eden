/** Raw sessions → Lisbon timestamps, programme dates, and film groups (same film across cinemas). */
import { createHash } from "node:crypto";
import type { RawSession } from "./types.ts";
import { normTitle, tidyTitle, yearInTitle } from "./titles.ts";
import { addDays, pad2 } from "./util.ts";

const OFFSET_FMT = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Lisbon", timeZoneName: "longOffset" });

/** UTC offset in Lisbon at that wall-clock moment: "+00:00" (WET) or "+01:00" (WEST). */
export function lisbonOffset(date: string, time: string): string {
  const name = OFFSET_FMT.formatToParts(new Date(`${date}T${time}:00Z`)).find((p) => p.type === "timeZoneName")!.value;
  return name === "GMT" ? "+00:00" : name.replace("GMT", "");
}

/**
 * Calendar date/time + the evening the session belongs to (spec: after-midnight sessions belong to the
 * previous evening). Sources give the real calendar date; NOS also states its operational date. A "24:30"
 * style time is rolled to the next calendar day.
 */
export function wallClock(s: Pick<RawSession, "date" | "time" | "programmeDate">) {
  let { date, time } = s;
  let programmeDate = s.programmeDate;
  const [h, m] = time.split(":").map(Number) as [number, number];
  if (h >= 24) {
    programmeDate ??= date;
    date = addDays(date, 1);
    time = `${pad2(h - 24)}:${pad2(m)}`;
  }
  programmeDate ??= h < 5 ? addDays(date, -1) : date;
  return { date, time, programmeDate, startsAt: `${date}T${time}:00${lisbonOffset(date, time)}` };
}

export function sessionId(s: RawSession, startsAt: string): string {
  const basis = [s.cinemaId, startsAt, normTitle(s.film.title), s.room ?? ""].join("|");
  return createHash("sha1").update(basis).digest("hex").slice(0, 12);
}

/** One film as seen across all sources, before TMDB. */
export interface FilmGroup {
  /** Normalised titles (PT and original) that identify this film. */
  keys: Set<string>;
  /** Display title variants → number of sessions using it. */
  titles: Map<string, number>;
  originals: Map<string, number>;
  year?: number;
  runtimes: number[];
  directors: string[];
  posters: string[];
  /** NOS aggregate ids, for mapping NOS's top list. */
  nosIds: Set<string>;
  sessions: RawSession[];
}

function rawYear(s: RawSession): number | undefined {
  return s.film.year ?? yearInTitle(s.film.title);
}

function bump(m: Map<string, number>, k: string | undefined) {
  if (k) m.set(k, (m.get(k) ?? 0) + 1);
}

export function newGroup(sessions: RawSession[]): FilmGroup {
  const g: FilmGroup = {
    keys: new Set(), titles: new Map(), originals: new Map(), runtimes: [], directors: [], posters: [], nosIds: new Set(), sessions,
  };
  const years: number[] = [];
  for (const s of sessions) {
    const f = s.film;
    g.keys.add(normTitle(f.title));
    if (f.originalTitle) g.keys.add(normTitle(f.originalTitle));
    bump(g.titles, tidyTitle(f.title));
    if (f.originalTitle) bump(g.originals, tidyTitle(f.originalTitle));
    const y = rawYear(s);
    if (y) years.push(y);
    if (f.runtimeMin) g.runtimes.push(f.runtimeMin);
    if (f.director && !g.directors.includes(f.director)) g.directors.push(f.director);
    if (f.posterUrl && !g.posters.includes(f.posterUrl)) g.posters.push(f.posterUrl);
    if (s.source === "nos" && f.sourceFilmId) g.nosIds.add(f.sourceFilmId);
  }
  g.keys.delete("");
  // Earliest year: festival premiere years precede Portuguese release years (TMDB uses the premiere).
  if (years.length) g.year = Math.min(...years);
  return g;
}

/**
 * Group raw sessions into films: titles and original titles that normalise equal are the same film
 * ("WILD HORSE NINE" at Ideal = NOS "Cavalo Selvagem Nove" / "Wild Horse Nine"). Different years
 * (more than ±1 apart) under one title are different films; year-less sessions join the most recent one.
 */
export function groupFilms(sessions: RawSession[]): FilmGroup[] {
  const parent = new Map<string, string>();
  const find = (k: string): string => {
    let r = k;
    while (parent.get(r) !== r) r = parent.get(r)!;
    parent.set(k, r);
    return r;
  };
  const add = (k: string) => { if (!parent.has(k)) parent.set(k, k); };
  const keysOf = (s: RawSession) =>
    [normTitle(s.film.title), s.film.originalTitle ? normTitle(s.film.originalTitle) : ""].filter(Boolean);

  for (const s of sessions) {
    const ks = keysOf(s);
    ks.forEach(add);
    for (const k of ks.slice(1)) parent.set(find(k), find(ks[0]!));
  }
  const comps = new Map<string, RawSession[]>();
  for (const s of sessions) {
    const root = find(keysOf(s)[0]!);
    comps.set(root, [...(comps.get(root) ?? []), s]);
  }

  const groups: FilmGroup[] = [];
  for (const members of comps.values()) {
    const years = [...new Set(members.map(rawYear).filter((y): y is number => !!y))].sort((a, b) => a - b);
    // Cluster years within ±1.
    const clusters: number[][] = [];
    for (const y of years) {
      const c = clusters.at(-1);
      if (c && y - c.at(-1)! <= 1) c.push(y);
      else clusters.push([y]);
    }
    if (clusters.length <= 1) {
      groups.push(newGroup(members));
      continue;
    }
    const buckets = clusters.map(() => [] as RawSession[]);
    for (const s of members) {
      const y = rawYear(s);
      const i = y ? clusters.findIndex((c) => c.includes(y)) : clusters.length - 1;
      buckets[i]!.push(s);
    }
    groups.push(...buckets.map(newGroup));
  }
  return groups;
}

/** Most common value of a list (first on ties). */
export function mode<T>(xs: T[]): T | undefined {
  const m = new Map<T, number>();
  for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1);
  let best: T | undefined;
  let n = 0;
  for (const [x, c] of m) if (c > n) [best, n] = [x, c];
  return best;
}
