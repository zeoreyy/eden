import type { SourceId, UrlKind } from "@eden/shared";

/** Film as described by one source (pre-matching). */
export interface RawFilm {
  /** Source's own id for the film, when it has one. */
  sourceFilmId?: string;
  title: string;
  originalTitle?: string;
  year?: number;
  runtimeMin?: number;
  director?: string;
  posterUrl?: string;
  /** Official film page on the source site. */
  filmUrl?: string;
}

/** One screening as a source reports it. Times are Europe/Lisbon wall-clock. */
export interface RawSession {
  source: SourceId;
  cinemaId: string;
  /** Calendar date of the screening, YYYY-MM-DD (Lisbon). */
  date: string;
  /** HH:MM, 24h (Lisbon). */
  time: string;
  /** Evening it belongs to, when the source states it (NOS operationalDate). */
  programmeDate?: string;
  film: RawFilm;
  room?: string;
  label?: string;
  url: string;
  urlKind: UrlKind;
  /** Stable id within the source when available. */
  sourceSessionId?: string;
}

export interface SourceResult {
  source: SourceId;
  sessions: RawSession[];
  /** Extra source-specific info worth keeping (e.g. NOS top list). */
  extras?: Record<string, unknown>;
  warnings: string[];
}

export type Scraper = () => Promise<SourceResult>;
