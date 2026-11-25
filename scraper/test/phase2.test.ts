import { describe, expect, it } from "vitest";
import type { Programme, Session } from "@eden/shared";
import { buildProgramme, chooseTitle, shortLabel } from "../src/build.ts";
import { directorsOverlap, findMatch, matchInput, type Matcher, type SearchHit, type TmdbApi, type TmdbFilm } from "../src/match.ts";
import { groupFilms, lisbonOffset, newGroup, wallClock } from "../src/normalize.ts";
import { noRatings, parseOmdb } from "../src/ratings.ts";
import { fuzzyEqual, normTitle, sameTitle, searchTitle, titleCase, tidyTitle, yearInTitle } from "../src/titles.ts";
import { topPicks } from "../src/toppicks.ts";
import type { RawFilm, RawSession, SourceResult } from "../src/types.ts";
import { validateSource } from "../src/validate.ts";

const TODAY = "2026-11-24";
const NOW = new Date("2026-11-24T17:00:00Z");

function raw(p: Partial<RawSession> & { film: RawFilm }): RawSession {
  return { source: "nos", cinemaId: "nos-colombo", date: TODAY, time: "21:00", url: "https://example.pt/s", urlKind: "session", ...p };
}

describe("titles", () => {
  it("normalises the same film across cinemas to one key", () => {
    expect(normTitle("HEXE: O REINO DA MAGIA")).toBe(normTitle("Hexe - O Reino da Magia"));
    expect(normTitle("O GATO DO CHAPEU")).toBe(normTitle("O Gato do Chapéu"));
    expect(normTitle("CHRISTOPHERS, OS")).toBe("os christophers");
    expect(normTitle("CONVERSA-AÇORDA")).toBe(normTitle("CONVERSA AÇORDA"));
    expect(normTitle("TRAINSPOTTING 30º ANIVERSÁRIO")).toBe("trainspotting");
    expect(normTitle("Nosferatu (1922)")).toBe("nosferatu");
    expect(normTitle("​O Exército das Sombras")).toBe("o exercito das sombras");
  });

  it("reads a year from the title and tidies it away", () => {
    expect(yearInTitle("Aurora (1927)")).toBe(1927);
    expect(tidyTitle("Aurora (1927)")).toBe("Aurora");
  });

  it("title-cases ALL CAPS Portuguese titles", () => {
    expect(titleCase("SENSIBILIDADE E BOM SENSO")).toBe("Sensibilidade e Bom Senso");
    expect(titleCase("DUNE PARTE TRES")).toBe("Dune Parte Tres");
    expect(titleCase("ROCKY II")).toBe("Rocky II");
  });

  it("fuzzy-equals only near-identical longer titles", () => {
    expect(fuzzyEqual("dune parte tres", "duna parte tres")).toBe(true);
    expect(fuzzyEqual("amor", "amok")).toBe(false);
    expect(fuzzyEqual("rocky", "eu sou rocky")).toBe(false);
  });

  it("ignores a leading article and e/and/& when comparing titles", () => {
    expect(sameTitle("shining", "the shining")).toBe(true);
    expect(sameTitle(normTitle("MINIMOS E MONSTROS"), normTitle("Mínimos & Monstros"))).toBe(true);
    expect(searchTitle("TRAINSPOTTING 30º ANIVERSÁRIO")).toBe("TRAINSPOTTING");
  });
});

describe("normalize", () => {
  it("uses Lisbon's offset (WET in winter, WEST in summer)", () => {
    expect(lisbonOffset("2026-11-24", "21:30")).toBe("+00:00");
    expect(lisbonOffset("2027-05-25", "19:15")).toBe("+01:00");
  });

  it("puts after-midnight sessions on the previous evening", () => {
    expect(wallClock({ date: "2026-11-25", time: "00:15", programmeDate: "2026-11-24" })).toMatchObject({
      startsAt: "2026-11-25T00:15:00+00:00", programmeDate: "2026-11-24",
    });
    expect(wallClock({ date: "2026-11-25", time: "00:30" }).programmeDate).toBe("2026-11-24");
    expect(wallClock({ date: "2026-11-24", time: "24:30" })).toMatchObject({ date: "2026-11-25", time: "00:30", programmeDate: "2026-11-24" });
    expect(wallClock({ date: "2026-11-24", time: "11:00" }).programmeDate).toBe("2026-11-24");
  });

  it("groups a film by PT and original titles across sources", () => {
    const groups = groupFilms([
      raw({ film: { title: "Cavalo Selvagem Nove", originalTitle: "Wild Horse Nine", sourceFilmId: "agg1" } }),
      raw({ source: "cinemacity", cinemaId: "cc-alvalade", film: { title: "CAVALO SELVAGEM NOVE" } }),
      raw({ source: "ideal", cinemaId: "ideal", film: { title: "WILD HORSE NINE" } }),
      raw({ source: "nimas", cinemaId: "nimas", film: { title: "Cavalo Selvagem Nove", year: 2026, director: "Martin McDonagh" } }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ year: 2026, directors: ["Martin McDonagh"] });
    expect([...groups[0]!.nosIds]).toEqual(["agg1"]);
  });

  it("keeps same-title films from different years apart", () => {
    const groups = groupFilms([
      raw({ source: "nimas", cinemaId: "nimas", film: { title: "Nosferatu (1922)" } }),
      raw({ film: { title: "Nosferatu", year: 2024 } }),
      raw({ film: { title: "NOSFERATU" } }),
    ]);
    expect(groups.map((g) => [g.year, g.sessions.length]).sort()).toEqual([[1922, 1], [2024, 2]]);
  });
});

// ── TMDB matching with a fake API ──
function fakeApi(hits: Record<string, SearchHit[]>, films: TmdbFilm[]): TmdbApi {
  return {
    search: async (q) => hits[normTitle(q)] ?? [],
    details: async (id) => films.find((f) => f.id === id)!,
  };
}
const tmdb = (p: Partial<TmdbFilm> & { id: number; title: string }): TmdbFilm => ({
  originalTitle: p.title, originalLanguage: "en", directors: [], ...p,
});
const hit = (f: TmdbFilm): SearchHit => ({ id: f.id, title: f.title, originalTitle: f.originalTitle, releaseDate: f.releaseDate, popularity: 1 });

describe("TMDB matching", () => {
  const amour = tmdb({ id: 1, title: "Amor", originalTitle: "Amour", year: 2012, releaseDate: "2012-05-20", directors: ["Michael Haneke"] });
  const amor2024 = tmdb({ id: 2, title: "Amor", year: 2024, releaseDate: "2024-01-01", directors: ["Someone Else"] });

  it("needs the year to agree", async () => {
    const api = fakeApi({ amor: [hit(amor2024), hit(amour)] }, [amour, amor2024]);
    const g = newGroup([raw({ source: "nimas", cinemaId: "nimas", film: { title: "Amor", year: 2012, director: "Michael Haneke" } })]);
    expect((await findMatch(matchInput(g), api, TODAY)).match?.film.id).toBe(1);
  });

  it("rejects a title-only match that isn't a recent film", async () => {
    const old = tmdb({ id: 3, title: "Fantasy", year: 1990, releaseDate: "1990-01-01" });
    const g = newGroup([raw({ source: "saojorge", cinemaId: "sao-jorge", film: { title: "FANTASY", runtimeMin: 98 } })]);
    expect((await findMatch(matchInput(g), fakeApi({ fantasy: [hit(old)] }, [old]), TODAY)).match).toBeNull();
  });

  it("accepts a recent exact match without year when runtime agrees", async () => {
    const f = tmdb({ id: 4, title: "Verity", year: 2026, releaseDate: "2026-10-01", runtime: 115 });
    const g = newGroup([raw({ film: { title: "Verity", runtimeMin: 117 } })]);
    expect((await findMatch(matchInput(g), fakeApi({ verity: [hit(f)] }, [f]), TODAY)).match?.how).toBe("exact");
  });

  it("matches one half of a two-language title when the director agrees", async () => {
    const f = tmdb({ id: 5, title: "Disponível para Amar", originalTitle: "花樣年華", year: 2000, releaseDate: "2000-09-29", directors: ["Wong Kar-wai"] });
    const g = newGroup([raw({ source: "nimas", cinemaId: "nimas", film: { title: "In the Mood For Love — Disponível Para Amar", year: 2000, director: "Wong Kar Wai" } })]);
    const api = fakeApi({ "disponivel para amar": [hit(f)] }, [f]);
    expect((await findMatch(matchInput(g), api, TODAY)).match?.film.id).toBe(5);
  });

  it("finds a film TMDB only knows by its original title via director + year + runtime", async () => {
    const short = tmdb({ id: 8, title: "Fatherland", year: 2026, releaseDate: "2026-08-03", runtime: 4, directors: ["Tulani Hlalo"] });
    const real = tmdb({ id: 9, title: "Ojczyzna", year: 2026, releaseDate: "2026-06-19", runtime: 82, directors: ["Paweł Pawlikowski"] });
    const g = newGroup([raw({ source: "nimas", cinemaId: "nimas", film: { title: "Fatherland", year: 2026, runtimeMin: 82, director: "Pawel Pawlikowski" } })]);
    const r = await findMatch(matchInput(g), fakeApi({ fatherland: [hit(short), hit(real)] }, [short, real]), TODAY);
    expect(r.match).toMatchObject({ film: { id: 9 }, how: "director" });
  });

  it("treats directors written in another script as unknown, not as a mismatch", async () => {
    const f = tmdb({ id: 11, title: "Solaris", originalTitle: "Солярис", year: 1972, releaseDate: "1972-03-20", directors: ["Андрей Тарковский"] });
    const g = newGroup([raw({ source: "nimas", cinemaId: "nimas", film: { title: "Solaris", year: 1972, director: "Andrei Tarkovsky" } })]);
    expect((await findMatch(matchInput(g), fakeApi({ solaris: [hit(f)] }, [f]), TODAY)).match?.film.id).toBe(11);
  });

  it("compares directors by surname, tolerating transliteration", () => {
    expect(directorsOverlap(["Lev Kulechov"], ["Lev Kuleshov"])).toBe(true);
    expect(directorsOverlap(["Javier Calvo, Javier Ambrossi"], ["Javier Ambrossi", "Javier Calvo"])).toBe(true);
    expect(directorsOverlap(["Yuval Abraham & Rachel Szor"], ["Rachel Szor"])).toBe(true);
    expect(directorsOverlap(["Martin McDonagh"], ["Ti West"])).toBe(false);
  });
});

describe("ratings", () => {
  it("parses OMDb's IMDb rating and drops N/A", () => {
    expect(parseOmdb({ Response: "True", imdbRating: "7.9", Ratings: [{ Source: "Rotten Tomatoes", Value: "93%" }] })).toEqual({ imdb: 7.9 });
    expect(parseOmdb({ Response: "True", imdbRating: "N/A", Ratings: [] })).toEqual({});
    expect(parseOmdb({ Response: "False", Error: "Incorrect IMDb ID." })).toEqual({});
  });
});

describe("top picks", () => {
  const s = (filmKey: string, cinemaId: string, t = "21:00", date = TODAY): Session => ({
    id: `${filmKey}${cinemaId}${t}`, filmKey, cinemaId, startsAt: `${date}T${t}:00+00:00`, programmeDate: TODAY, url: "https://x", urlKind: "session",
  });
  const three = (k: string, t?: string) => ["nos-colombo", "nos-amoreiras", "cc-alvalade"].map((c) => s(k, c, t));

  it("needs 3 commercial cinemas in the evening, NOS's list first, max 6", () => {
    const sessions = [
      ...three("a"), ...three("b"), s("b", "nos-oeiras-parque"), ...three("c"),
      ...three("morning", "11:00"),
      ...["nimas", "ideal", "cinemateca"].map((c) => s("arthouse", c)),
      s("late", "nos-colombo", "00:30", "2026-11-25"), s("late", "nos-amoreiras", "00:30", "2026-11-25"), s("late", "cc-alvalade", "00:30", "2026-11-25"),
    ];
    expect(topPicks(sessions, ["c", "zzz"])[TODAY]).toEqual(["c", "b", "a"]);
    const many = "abcdefgh".split("").flatMap((k) => three(k));
    expect(topPicks(many, [])[TODAY]).toHaveLength(6);
  });
});

describe("validation", () => {
  const result = (sessions: RawSession[]): SourceResult => ({ source: "nimas", sessions, warnings: [] });
  const ok = raw({ source: "nimas", cinemaId: "nimas", film: { title: "Fatherland" } });

  it("fails on no sessions, malformed data, or a collapse vs the last good run", () => {
    expect(validateSource(result([]), TODAY).ok).toBe(false);
    expect(validateSource(result([ok, { ...ok, url: "not a url" }]), TODAY).ok).toBe(false);
    expect(validateSource(result([ok, ok]), TODAY, 100)).toMatchObject({ ok: false, note: "only 2 sessions (last good run: 100)" });
    expect(validateSource(result([ok, ok]), TODAY, 4).ok).toBe(true);
  });

  it("drops past days", () => {
    expect(validateSource(result([ok, { ...ok, date: "2026-11-20" }]), TODAY).sessions).toHaveLength(1);
  });
});

describe("build", () => {
  const dune = tmdb({ id: 10, title: "Duna: Parte Três", originalTitle: "Dune: Part Three", year: 2026, releaseDate: "2026-12-17", imdbId: "tt1", directors: ["Denis Villeneuve"], posterPath: "/p.jpg" });
  const matcher: Matcher = {
    async match(g) {
      if (g.keys.has("dune part three")) return { match: { film: dune, how: "exact" }, nearIds: [] };
      if (g.keys.has("dune parte tres")) return { match: null, nearIds: [10] };
      return { match: null, nearIds: [] };
    },
    details: async () => dune,
    save() {},
  };
  const nos: SourceResult = {
    source: "nos", warnings: [],
    sessions: [raw({ film: { title: "Dune - Duna: Parte Três", originalTitle: "Dune - Part Three", runtimeMin: 145 } })],
  };
  const cc: SourceResult = {
    source: "cinemacity", warnings: [],
    sessions: [raw({ source: "cinemacity", cinemaId: "cc-alvalade", film: { title: "DUNE PARTE TRES" } })],
  };

  it("merges a near-miss into the film another cinema matched, and links Letterboxd by TMDB id", async () => {
    const { programme } = await buildProgramme({ results: { nos, cinemacity: cc }, matcher, ratings: noRatings, now: NOW });
    expect(programme.films.filter((f) => f.key === "tmdb-10")).toHaveLength(1);
    expect(programme.films[0]).toMatchObject({
      title: "Dune - Duna: Parte Três", originalTitle: "Dune: Part Three", year: 2026, runtimeMin: 145,
      posterUrl: "https://image.tmdb.org/t/p/w342/p.jpg", letterboxdUrl: "https://letterboxd.com/tmdb/10/",
    });
    expect(new Set(programme.sessions.map((s) => s.filmKey))).toEqual(new Set(["tmdb-10"]));
  });

  it("keeps the last good data of a failing source and never hides it", async () => {
    const previous: Programme = {
      generatedAt: "2026-11-23T07:00:00Z",
      films: [{ key: "t-old", title: "Old Film" }],
      sessions: [{ id: "p1", filmKey: "t-old", cinemaId: "nimas", startsAt: `${TODAY}T21:00:00+00:00`, programmeDate: TODAY, url: "https://medeiafilmes.com/x", urlKind: "film" }],
      topPicks: {},
      sources: { nimas: { cinemaIds: ["nimas"], lastSuccess: "2026-11-23T07:00:00Z", lastAttempt: "2026-11-23T07:00:00Z", ok: true } } as Programme["sources"],
    };
    const { programme } = await buildProgramme({ results: { nimas: new Error("500 Internal Server Error") }, previous, matcher, ratings: noRatings, now: NOW });
    expect(programme.sources.nimas).toMatchObject({ ok: false, lastSuccess: "2026-11-23T07:00:00Z", note: "500 Internal Server Error" });
    expect(programme.sessions.map((s) => s.id)).toContain("p1");
    expect(programme.films.map((f) => f.key)).toContain("t-old");
    expect(programme.sources.uci).toMatchObject({ ok: false, lastSuccess: null });
    expect(programme.sources.nimas.failures).toBe(1);
    const again = await buildProgramme({ results: { nimas: new Error("500") }, previous: programme, matcher, ratings: noRatings, now: NOW });
    expect(again.programme.sources.nimas).toMatchObject({ failures: 2, lastSuccess: "2026-11-23T07:00:00Z" });
  });

  it("keeps one short label", () => {
    expect(shortLabel("Correspondências - Rita Azevedo Gomes | Realizadora Convidada")).toBe("Correspondências - Rita Azevedo Gomes");
    expect(shortLabel("IMAX")).toBe("IMAX");
  });

  it("prefers the cinemas' mixed-case title, fixing ALL CAPS with TMDB casing", () => {
    const g = newGroup([raw({ source: "cinemacity", cinemaId: "cc-alvalade", film: { title: "MEMÓRIA DE RAPARIGA" } })]);
    const m = { film: tmdb({ id: 7, title: "Memória de Rapariga" }), how: "exact" };
    expect(chooseTitle(g, m)).toBe("Memória de Rapariga");
    expect(chooseTitle(g, null)).toBe("Memória de Rapariga");
  });
});
