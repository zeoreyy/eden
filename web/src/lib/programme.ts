/** Pure selectors over the programme JSON (no fetching here). */
import { CINEMA_BY_ID, CINEMAS } from "@eden/shared";
import type { Cinema, Film, Programme, Session, SourceStatus } from "@eden/shared";
import { addDays } from "./time.ts";

export interface FilmDay { film: Film; sessions: Session[] }

export const isArthouse = (s: Session) => CINEMA_BY_ID.get(s.cinemaId)?.kind === "arthouse";

/**
 * Films showing on `date`, top picks first (in their order), then by next session time (spec).
 * When `now` is given (Hoje), past sessions are hidden and films with none left drop out.
 */
export function filmsOnDay(p: Programme, films: Map<string, Film>, date: string, now?: number): FilmDay[] {
  const byFilm = new Map<string, Session[]>();
  for (const s of p.sessions) {
    if (s.programmeDate !== date) continue;
    if (now != null && Date.parse(s.startsAt) <= now) continue;
    (byFilm.get(s.filmKey) ?? byFilm.set(s.filmKey, []).get(s.filmKey)!).push(s);
  }
  const picks = p.topPicks[date] ?? [];
  const rank = (k: string) => (picks.includes(k) ? picks.indexOf(k) : Infinity);
  return [...byFilm]
    .flatMap(([key, sessions]) => {
      const film = films.get(key);
      return film ? [{ film, sessions: sessions.sort(bySession) }] : [];
    })
    .sort((a, b) => rank(a.film.key) - rank(b.film.key) || bySession(a.sessions[0]!, b.sessions[0]!) || a.film.title.localeCompare(b.film.title, "pt"));
}

export function bySession(a: Session, b: Session): number {
  return a.startsAt.localeCompare(b.startsAt) || (CINEMA_BY_ID.get(a.cinemaId)?.shortName ?? "").localeCompare(CINEMA_BY_ID.get(b.cinemaId)?.shortName ?? "", "pt");
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
        .sort((a, b) => bySession(a.sessions[0]!, b.sessions[0]!)),
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

export interface CinemaStatus { cinema: Cinema; status?: SourceStatus }

/** Cinemas whose source is not fresh — shown, never hidden (spec). */
export function staleCinemas(p: Programme, kind?: Cinema["kind"]): CinemaStatus[] {
  return CINEMAS.filter((c) => (!kind || c.kind === kind) && p.sources[c.source] && !p.sources[c.source].ok)
    .map((cinema) => ({ cinema, status: p.sources[cinema.source] }));
}

export function cinemasOfKind(kind: Cinema["kind"]): Cinema[] {
  return CINEMAS.filter((c) => c.kind === kind);
}
