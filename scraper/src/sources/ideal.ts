// Cinema Ideal — public JSON from its own booking system (docs/sources.md §7).
import { politeFetch } from "../http.ts";
import type { RawSession, SourceResult } from "../types.ts";

const ENDPOINT = "https://bilheteira.cinemaidealemcasa.pt/session/with-movies";
// The booking app only reads ?movieid= (verified in its bundle) — no per-session deep link.
const FILM_URL = "https://bilheteira.cinemaidealemcasa.pt/?movieid=";

export interface IdealSession {
  id: number;
  dateTime: string; // Lisbon local, no offset
  movieId: number;
  movie: { id: number; title: string; imageUrl?: string };
  isPrivate: boolean;
  isDev?: boolean;
}

export function parseIdeal(items: IdealSession[]): RawSession[] {
  return items
    .filter((s) => !s.isPrivate && !s.isDev)
    .map((s) => ({
      source: "ideal" as const,
      cinemaId: "ideal",
      date: s.dateTime.slice(0, 10),
      time: s.dateTime.slice(11, 16),
      film: {
        sourceFilmId: String(s.movieId),
        title: s.movie.title.trim(),
        posterUrl: s.movie.imageUrl || undefined,
        filmUrl: FILM_URL + s.movieId,
      },
      url: FILM_URL + s.movieId,
      urlKind: "film" as const,
      sourceSessionId: String(s.id),
    }));
}

export async function scrapeIdeal(): Promise<SourceResult> {
  const items = (await (await politeFetch(ENDPOINT)).json()) as IdealSession[];
  return { source: "ideal", sessions: parseIdeal(items), warnings: [] };
}
