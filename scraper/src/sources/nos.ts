// Cinemas NOS — public JSON (docs/sources.md §1).
import { cinemasForSource } from "@eden/shared";
import { politeFetch } from "../http.ts";
import type { RawFilm, RawSession, SourceResult } from "../types.ts";
import { addDays } from "../util.ts";

const BASE = "https://www.cinemas.nos.pt";
const TICKET = "https://bilheteira.cinemas.nos.pt/Cinemas/Ticket?SessionUUID=";

export interface NosMovie {
  uuid: string;
  title: string;
  originaltitle?: string;
  aggregateformatnumber: string;
  duration?: string;
  director?: string;
  releasedate?: string;
  format?: string;
  version?: string;
  portraitimages?: { path?: string };
  detailurl?: string;
  moviestate?: string;
  position?: number;
}
interface NosSession {
  uuid: string;
  time: string;
  description?: string;
  operationalDate: string;
  format?: string;
  version?: string;
}
export interface NosSessionsResponse {
  days: { name: string; theaters: { theaterId: string; name: string; sessions: NosSession[] }[] }[];
}

const THEATERS = new Map(cinemasForSource("nos").map((c) => [c.sourceRef!, c.id]));

/** Strip format/version suffixes NOS appends to titles: "(IMAX)", "(VP 3D)", "(VO)", "(3D INIFNITY)" [sic]. */
export function cleanNosTitle(t: string): string {
  return t
    .replace(/\s*\((?=[^)]*\b(?:VP|VO|IMAX|ATMOS|4DX|SCREENX|XVISION|XLVISION|3D|2D|INI?FI?NITY)\b)[^)]*\)\s*$/i, "")
    .trim();
}

const FORMAT_LABEL: Record<string, string> = {
  imax: "IMAX", "4dx": "4DX", "3d": "3D", atmos: "Atmos", "screenx atmos": "ScreenX",
  "xvision atmos": "XVision", "xl vision atmos": "XL Vision",
};

export function nosLabel(s: Pick<NosSession, "format" | "version" | "description">): string | undefined {
  const fmt = FORMAT_LABEL[(s.format ?? "").toLowerCase()];
  const room = (s.description ?? "").toLowerCase().replace(/\s/g, "");
  // Don't repeat what the room name already says ("IMAX" room, "Sala 4DX", "Sala NOS XVision").
  const parts = [fmt && !room.includes(fmt.toLowerCase().replace(/\s/g, "")) ? fmt : undefined];
  if ((s.version ?? "").toLowerCase() === "dob") parts.push("VP");
  return parts.filter(Boolean).join(" · ") || undefined;
}

export function nosFilm(m: NosMovie): RawFilm {
  const film: RawFilm = { sourceFilmId: m.aggregateformatnumber, title: cleanNosTitle(m.title) };
  if (m.originaltitle?.trim()) film.originalTitle = m.originaltitle.trim();
  const dur = Number(m.duration);
  if (dur > 0) film.runtimeMin = dur;
  if (m.director?.trim()) film.director = m.director.trim();
  if (m.portraitimages?.path) film.posterUrl = `https:${m.portraitimages.path}`;
  if (m.detailurl) film.filmUrl = `${BASE}${m.detailurl}`;
  return film;
}

/** Parse one film's session aggregate, keeping only our 8 AML theaters. */
export function parseNosSessions(resp: NosSessionsResponse, film: RawFilm): RawSession[] {
  const out: RawSession[] = [];
  for (const day of resp.days ?? []) {
    for (const th of day.theaters ?? []) {
      const cinemaId = THEATERS.get(th.theaterId);
      if (!cinemaId) continue;
      for (const s of th.sessions ?? []) {
        const opDate = s.operationalDate.slice(0, 10);
        // After-midnight sessions keep the previous operationalDate → calendar date is the next day.
        const date = Number(s.time.slice(0, 2)) < 5 ? addDays(opDate, 1) : opDate;
        out.push({
          source: "nos", cinemaId, date, time: s.time, programmeDate: opDate, film,
          room: s.description?.trim() || undefined, label: nosLabel(s),
          url: TICKET + s.uuid, urlKind: "session", sourceSessionId: s.uuid,
        });
      }
    }
  }
  return out;
}

async function json<T>(path: string, latin1 = false): Promise<T> {
  const res = await politeFetch(BASE + path);
  if (!latin1) return (await res.json()) as T;
  // getMovieSessions answers in Latin-1 despite "application/json" (the graphql endpoints are UTF-8).
  return JSON.parse(new TextDecoder("latin1").decode(await res.arrayBuffer())) as T;
}

type MovieList = { data: { movieList: { items: NosMovie[] } } };
type TheaterList = { data: { theaterList: { items: { movies: NosMovie[] }[] } } };

export async function scrapeNos(): Promise<SourceResult> {
  const warnings: string[] = [];
  const movies = new Map<string, NosMovie>();
  const top = await json<MovieList>("/graphql/execute.json/cinemas/getTopMovies");
  // Per-theater lists include pre-sales and events missing from getMoviesInTheaters.
  for (const tid of THEATERS.keys()) {
    const r = await json<TheaterList>(`/graphql/execute.json/cinemas/getMoviesbyTheaterID;theaterID=${tid}`);
    for (const m of r.data.theaterList.items[0]?.movies ?? []) {
      const prev = movies.get(m.aggregateformatnumber);
      // Prefer the plain-format variant (uuid == aggregate) as the film's representative.
      if (!prev || m.uuid === m.aggregateformatnumber) movies.set(m.aggregateformatnumber, m);
    }
  }
  const sessions: RawSession[] = [];
  for (const [agg, m] of movies) {
    try {
      const r = await json<NosSessionsResponse>(
        `/bin/cinemas/render/getMovieSessions.getMovieSessionsAggregator.json?aggregateMovieId=${agg}`, true);
      sessions.push(...parseNosSessions(r, nosFilm(m)));
    } catch (e) {
      warnings.push(`sessions for ${m.title}: ${(e as Error).message}`);
    }
  }
  const topMovies = top.data.movieList.items
    .slice().sort((a, b) => (a.position ?? 999) - (b.position ?? 999))
    .map((m) => ({ position: m.position, aggregate: m.aggregateformatnumber, title: cleanNosTitle(m.title), state: m.moviestate }));
  return { source: "nos", sessions, warnings, extras: { topMovies } };
}
