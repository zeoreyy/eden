import { describe, expect, it } from "vitest";
import type { Film, Programme, Session } from "@eden/shared";
import { beyondCommercialWeek, filmsOnDay, filmSchedule, nextSessionDate, staleCinemas } from "../src/lib/programme.ts";
import { parseRoute, routeHref } from "../src/lib/hooks.ts";
import { weekdayShort } from "../src/lib/time.ts";

const s = (filmKey: string, cinemaId: string, startsAt: string, programmeDate = startsAt.slice(0, 10)): Session =>
  ({ id: `${filmKey}${cinemaId}${startsAt}`, filmKey, cinemaId, startsAt, programmeDate, url: "https://x", urlKind: "session" });
const films: Film[] = [{ key: "a", title: "A" }, { key: "b", title: "B" }, { key: "c", title: "C" }];
const p: Programme = {
  generatedAt: "2026-11-25T07:00:00Z", films,
  sessions: [
    s("a", "nos-colombo", "2026-11-25T21:00:00+00:00"), s("b", "nimas", "2026-11-25T19:00:00+00:00"),
    s("b", "nimas", "2026-11-25T11:00:00+00:00"), s("c", "ideal", "2026-11-25T10:00:00+00:00"),
    s("a", "nos-colombo", "2026-11-26T00:30:00+00:00", "2026-11-25"),
  ],
  topPicks: { "2026-11-25": ["a"] },
  sources: { uci: { cinemaIds: ["uci-el-corte-ingles", "uci-ubbo"], lastSuccess: null, lastAttempt: "x", ok: false } } as Programme["sources"],
};
const map = new Map(films.map((f) => [f.key, f]));

describe("selectors", () => {
  it("puts top picks first, then by next session; hides past sessions on Hoje", () => {
    const now = Date.parse("2026-11-25T12:00:00Z");
    const day = filmsOnDay(p, map, "2026-11-25", now);
    expect(day.map((d) => d.film.key)).toEqual(["a", "b"]); // c only had a 10:00 session
    expect(day[0]!.sessions).toHaveLength(2); // includes the 00:30 after-midnight session
  });

  it("filters by kind (Autor: arthouse only, never ranked) or by cinema", () => {
    const now = Date.parse("2026-11-25T08:00:00Z");
    expect(filmsOnDay(p, map, "2026-11-25", now, { kind: "arthouse" }).map((d) => d.film.key)).toEqual(["c", "b"]); // by time, no picks
    expect(filmsOnDay(p, map, "2026-11-25", now, { kind: "commercial" }).map((d) => d.film.key)).toEqual(["a"]);
    expect(filmsOnDay(p, map, "2026-11-25", now, { cinemaId: "nimas" }).map((d) => d.film.key)).toEqual(["b"]);
  });

  it("finds a cinema's next day with sessions instead of showing 0", () => {
    expect(nextSessionDate(p, "nimas", "2026-11-25", Date.parse("2026-11-25T20:00:00Z"))).toBeUndefined();
    expect(nextSessionDate(p, "nos-colombo", "2026-11-25", Date.parse("2026-11-25T22:00:00Z"))).toBe("2026-11-25"); // the 00:30 still counts
  });

  it("groups a film's schedule by day then cinema", () => {
    const sched = filmSchedule(p, "a", "2026-11-25", 0);
    expect(sched).toHaveLength(1);
    expect(sched[0]!.cinemas[0]!.sessions).toHaveLength(2);
  });

  it("flags days after the coming Wednesday", () => {
    expect(beyondCommercialWeek("2026-11-25", "2026-11-25")).toBe(false); // Wed
    expect(beyondCommercialWeek("2026-11-25", "2026-11-26")).toBe(true);
    expect(beyondCommercialWeek("2026-11-23", "2026-11-25")).toBe(false); // Mon → Wed
  });

  it("never hides a failing cinema", () => {
    expect(staleCinemas(p, "commercial").map((c) => c.cinema.id)).toEqual(["uci-el-corte-ingles", "uci-ubbo"]);
  });
});

describe("routing + time", () => {
  it("round-trips routes, day and film", () => {
    const r = { tab: "autor" as const, cinemaId: "cinemateca", day: "2026-11-27", film: "tmdb-426" };
    const href = routeHref(r);
    expect(href).toBe("/autor/cinemateca?dia=2026-11-27&filme=tmdb-426");
    const u = new URL(href, "https://eden.test");
    expect(parseRoute(u as unknown as Location)).toEqual(r);
  });

  it("keeps the Cinemas view in the URL", () => {
    expect(routeHref({ tab: "autor", view: "cinemas" })).toBe("/autor?ver=cinemas");
    expect(parseRoute(new URL("/autor?ver=cinemas", "https://eden.test") as unknown as Location)).toEqual({ tab: "autor", view: "cinemas" });
    expect(parseRoute(new URL("/?ver=cinemas", "https://eden.test") as unknown as Location)).toEqual({ tab: "semana" });
  });

  it("abbreviates Portuguese weekdays", () => {
    expect(weekdayShort("2026-11-25", "pt")).toBe("qua");
    expect(weekdayShort("2026-11-28", "pt")).toBe("sáb");
    expect(weekdayShort("2026-11-25", "en")).toBe("Wed");
  });
});
