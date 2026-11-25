export type CinemaKind = "commercial" | "arthouse";
export type Chain = "NOS" | "UCI" | "CinemaCity";
export type SourceId =
  | "nos" | "uci" | "cinemacity"
  | "cinemateca" | "saojorge" | "nimas" | "ideal" | "fernandolopes";
export type UrlKind = "session" | "film" | "venue";

export interface Cinema {
  id: string;
  name: string;
  shortName: string;
  kind: CinemaKind;
  chain?: Chain;
  source: SourceId;
  /** Most specific official venue page (verified). */
  url: string;
  /** Source-specific identifier (NOS theater uuid, UCI siteId, Cinema City id…). */
  sourceRef?: string;
}

export interface Film {
  key: string;
  title: string;
  originalTitle?: string;
  year?: number;
  runtimeMin?: number;
  posterUrl?: string;
  tmdbId?: number;
  imdbId?: string;
  imdb?: number;
  letterboxdUrl?: string;
  /** The film's page on a cinema's own site (as scraped; never built). */
  pageUrl?: string;
}

export interface Session {
  id: string;
  filmKey: string;
  cinemaId: string;
  /** ISO 8601 with Europe/Lisbon offset, e.g. 2026-11-24T21:30:00+00:00 */
  startsAt: string;
  /** YYYY-MM-DD — the evening the session belongs to (after-midnight rule). */
  programmeDate: string;
  room?: string;
  label?: string;
  url: string;
  urlKind: UrlKind;
}

export interface SourceStatus {
  cinemaIds: string[];
  lastSuccess: string | null;
  lastAttempt: string;
  ok: boolean;
  note?: string;
  /** Consecutive failed runs (CI opens an issue at 2). */
  failures?: number;
}

export interface Programme {
  generatedAt: string;
  films: Film[];
  sessions: Session[];
  /** date (YYYY-MM-DD) -> ordered film keys */
  topPicks: Record<string, string[]>;
  sources: Record<SourceId, SourceStatus>;
}
