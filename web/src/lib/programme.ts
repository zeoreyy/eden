/** Pure selectors over the programme JSON (no fetching here). */
import { CINEMA_BY_ID, CINEMAS, cinemaRank, cinemaZone } from "@eden/shared";
import type { Cinema, Film, Programme, Session, SourceStatus, Zone } from "@eden/shared";
import { addDays } from "./time.ts";

export interface FilmDay { film: Film; sessions: Session[] }

export const isArthouse = (s: Session) => CINEMA_BY_ID.get(s.cinemaId)?.kind === "arthouse";

/**
 * Films showing on `date`, top picks first (in their order), then by next session time (spec).
 * When `now` is given (Hoje), past sessions are hidden and films with none left drop out.
 */
export interface FilmFilter {
  cinemaId?: string; kind?: Cinema["kind"];
  /** Search text: matches the PT or original title, ignoring accents and case. */
  q?: string;
  /** "HH:MM": sessions starting at or after (after-midnight sessions count as late that evening). */
  after?: string;
  /** Films of at most this many minutes. */
  maxMin?: number;
  zone?: Zone;
}

/** "Cavalo Selvagem Nove" → "cavalo selvagem nove"; "Duna: Parte Três" → "duna parte tres". */
export function fold(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

export function titleMatches(f: Film, q: string): boolean {
  const k = fold(q);
  return !k || [f.title, f.originalTitle].some((t) => !!t && fold(t).includes(k));
}

/** Minutes after the evening's midnight: 00:30 that belongs to the previous evening counts as 24:30. */
function eveningMinutes(s: Session): number {
  const m = Number(s.startsAt.slice(11, 13)) * 60 + Number(s.startsAt.slice(14, 16));
  return s.startsAt.slice(0, 10) !== s.programmeDate ? m + 1440 : m;
}

function filmPasses(f: Film | undefined, { q, maxMin }: FilmFilter): boolean {
  if (!f) return false;
  if (q && !titleMatches(f, q)) return false;
  if (maxMin && !(f.runtimeMin && f.runtimeMin <= maxMin)) return false; // unknown runtime: hidden while the filter is on
  return true;
}

export function filmsOnDay(p: Programme, films: Map<string, Film>, date: string, now?: number, filter: FilmFilter = {}): FilmDay[] {
  const { cinemaId, kind, after, zone } = filter;
  const afterMin = after ? Number(after.slice(0, 2)) * 60 + Number(after.slice(3, 5)) : undefined;
  const byFilm = new Map<string, Session[]>();
  for (const s of p.sessions) {
    if (s.programmeDate !== date || (cinemaId && s.cinemaId !== cinemaId)) continue;
    if (kind && CINEMA_BY_ID.get(s.cinemaId)?.kind !== kind) continue;
    if (zone && cinemaZone(s.cinemaId) !== zone) continue;
    if (afterMin != null && eveningMinutes(s) < afterMin) continue;
    if (!filmPasses(films.get(s.filmKey), filter)) continue;
    if (now != null && Date.parse(s.startsAt) <= now) continue;
    (byFilm.get(s.filmKey) ?? byFilm.set(s.filmKey, []).get(s.filmKey)!).push(s);
  }
  // A cinema's own page is chronological; arthouse is never ranked (spec); otherwise top picks first.
  const picks = cinemaId || kind === "arthouse" ? [] : p.topPicks[date] ?? [];
  const rank = (k: string) => (picks.includes(k) ? picks.indexOf(k) : Infinity);
  return [...byFilm]
    .flatMap(([key, sessions]) => {
      const film = films.get(key);
      return film ? [{ film, sessions: sessions.sort(bySession) }] : [];
    })
    .sort((a, b) => rank(a.film.key) - rank(b.film.key) || bySession(a.sessions[0]!, b.sessions[0]!) || a.film.title.localeCompare(b.film.title, "pt"));
}

export function bySession(a: Session, b: Session): number {
  // Same time → the cinema closer to the centre first.
  return a.startsAt.localeCompare(b.startsAt) || cinemaRank(a.cinemaId) - cinemaRank(b.cinemaId);
}

/** One cinema's day as a timeline. */
export function cinemaDay(p: Programme, cinemaId: string, date: string, now?: number): Session[] {
  return p.sessions
    .filter((s) => s.cinemaId === cinemaId && s.programmeDate === date && (now == null || Date.parse(s.startsAt) > now))
    .sort(bySession);
}

/** All of a film's sessions from `fromDate` on (past ones today hidden), grouped day → cinema. */
export function filmSchedule(p: Programme, filmKey: string, fromDate: string, now: number) {
  const days = new Map<string, Map<string, Session[]>>();
  for (const s of p.sessions) {
    if (s.filmKey !== filmKey || s.programmeDate < fromDate || Date.parse(s.startsAt) <= now) continue;
    const d = days.get(s.programmeDate) ?? days.set(s.programmeDate, new Map()).get(s.programmeDate)!;
    (d.get(s.cinemaId) ?? d.set(s.cinemaId, []).get(s.cinemaId)!).push(s);
  }
  return [...days]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, cinemas]) => ({
      date,
      cinemas: [...cinemas].map(([cinemaId, sessions]) => ({ cinema: CINEMA_BY_ID.get(cinemaId)!, sessions: sessions.sort(bySession) }))
        .sort((a, b) => cinemaRank(a.cinema.id) - cinemaRank(b.cinema.id)), // centre-out (José)
    }));
}

/** Rolling 7 days from today (decision #10). */
export function weekDays(today: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(today, i));
}

/** NOS/UCI publish until Wednesday; days after the coming Wednesday only have pre-sales so far. */
export function beyondCommercialWeek(today: string, date: string): boolean {
  const dow = new Date(`${today}T12:00:00Z`).getUTCDay(); // 0 Sun … 3 Wed
  const nextWed = addDays(today, (3 - dow + 7) % 7);
  return date > nextWed;
}

/** Days (of `days`) that have at least one result for this filter — dots in the day selector. */
export function daysWithResults(p: Programme, films: Map<string, Film>, days: string[], today: string, now: number, filter: FilmFilter): Set<string> {
  return new Set(days.filter((d) => filmsOnDay(p, films, d, d === today ? now : undefined, filter).length > 0));
}

/** First day (from today) with a session still to come at this cinema, if any. */
export function nextSessionDate(p: Programme, cinemaId: string, today: string, now: number): string | undefined {
  let best: string | undefined;
  for (const s of p.sessions) {
    if (s.cinemaId !== cinemaId || s.programmeDate < today || Date.parse(s.startsAt) <= now) continue;
    if (!best || s.programmeDate < best) best = s.programmeDate;
  }
  return best;
}

export interface CinemaStatus { cinema: Cinema; status?: SourceStatus }

/** Cinemas whose source is not fresh — shown, never hidden (spec). */
export function staleCinemas(p: Programme, kind?: Cinema["kind"]): CinemaStatus[] {
  return CINEMAS.filter((c) => (!kind || c.kind === kind) && p.sources[c.source] && !p.sources[c.source].ok)
    .sort((a, b) => cinemaRank(a.id) - cinemaRank(b.id))
    .map((cinema) => ({ cinema, status: p.sources[cinema.source] }));
}

export function cinemasOfKind(kind: Cinema["kind"]): Cinema[] {
  return CINEMAS.filter((c) => c.kind === kind).sort((a, b) => cinemaRank(a.id) - cinemaRank(b.id));
}
