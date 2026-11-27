import { describe, expect, it } from "vitest";
import type { Film, Programme, Session } from "@eden/shared";
import { filmsOnDay, fold, titleMatches, daysWithResults } from "../src/lib/programme.ts";
import { parseRoute, routeHref } from "../src/lib/hooks.ts";
import { platform } from "../src/lib/device.ts";

const s = (filmKey: string, cinemaId: string, startsAt: string, programmeDate = startsAt.slice(0, 10)): Session =>
  ({ id: `${filmKey}${cinemaId}${startsAt}`, filmKey, cinemaId, startsAt, programmeDate, url: "https://x", urlKind: "session" });
const films: Film[] = [
  { key: "dune", title: "Dune - Duna: Parte Três", originalTitle: "Dune: Part Three", runtimeMin: 145 },
  { key: "cavalo", title: "Cavalo Selvagem Nove", originalTitle: "Wild Horse Nine", runtimeMin: 118 },
  { key: "short", title: "Curtas", runtimeMin: undefined },
];
const map = new Map(films.map((f) => [f.key, f]));
const p: Programme = {
  generatedAt: "x", films, topPicks: {}, sources: {} as Programme["sources"],
  sessions: [
    s("dune", "nos-colombo", "2026-11-27T18:00:00+00:00"), s("dune", "nos-almada-forum", "2026-11-27T21:30:00+00:00"),
    s("cavalo", "ideal", "2026-11-27T21:00:00+00:00"), s("cavalo", "nos-colombo", "2026-11-28T00:15:00+00:00", "2026-11-27"),
    s("short", "sao-jorge", "2026-11-27T19:00:00+00:00"), s("dune", "cc-alegro-setubal", "2026-11-29T20:00:00+00:00"),
  ],
};
const keys = (f: object) => filmsOnDay(p, map, "2026-11-27", undefined, f).map((d) => d.film.key);

describe("search + filters", () => {
  it("matches PT or original title, ignoring accents and case", () => {
    expect(fold("Duna: Parte Três")).toBe("duna parte tres");
    expect(titleMatches(films[0]!, "part three")).toBe(true);
    expect(titleMatches(films[1]!, "WILD horse")).toBe(true);
    expect(keys({ q: "tres" })).toEqual(["dune"]);
  });

  it("'Depois das' keeps later sessions, and after-midnight ones count as late", () => {
    expect(keys({ after: "21:00" }).sort()).toEqual(["cavalo", "dune"]);
    expect(filmsOnDay(p, map, "2026-11-27", undefined, { after: "23:00" }).map((d) => [d.film.key, d.sessions.length])).toEqual([["cavalo", 1]]);
  });

  it("'Duração até' hides longer films and unknown runtimes", () => {
    expect(keys({ maxMin: 120 })).toEqual(["cavalo"]);
  });

  it("zone keeps only that area's cinemas", () => {
    expect(keys({ zone: "margem-sul" })).toEqual(["dune"]);
    expect(daysWithResults(p, map, ["2026-11-27", "2026-11-28", "2026-11-29"], "2026-11-27", 0, { zone: "margem-sul", after: "19:30" }))
      .toEqual(new Set(["2026-11-27", "2026-11-29"]));
  });
});

describe("routes carry search, filters and a shared session", () => {
  it("round-trips", () => {
    const r = { tab: "autor" as const, day: "2026-11-28", q: "dune", after: "19:30", maxMin: 120, zone: "lisboa" as const, film: "dune", session: "abc123" };
    const href = routeHref(r);
    expect(href).toBe("/autor?dia=2026-11-28&q=dune&depois=19%3A30&ate=120&zona=lisboa&filme=dune&sessao=abc123");
    expect(parseRoute(new URL(href, "https://e.test") as unknown as Location)).toEqual(r);
  });
  it("ignores junk", () => {
    expect(parseRoute(new URL("/?depois=25:00&ate=9&zona=porto", "https://e.test") as unknown as Location)).toEqual({ tab: "semana" });
  });
});

describe("add-to-home instructions per phone", () => {
  const ua = {
    ios26: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1",
    ios18: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
    iosChrome: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0 Mobile/15E148 Safari/604.1",
    android: "Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Mobile Safari/537.36",
    samsung: "Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/27.0 Chrome/125.0 Mobile Safari/537.36",
    mac: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
  };
  it("tells the phones apart", () => {
    expect(platform(ua.ios26, 5)).toBe("ios-safari-26");
    expect(platform(ua.ios18, 5)).toBe("ios-safari");
    expect(platform(ua.iosChrome, 5)).toBe("ios-other");
    expect(platform(ua.android, 5)).toBe("android-chrome");
    expect(platform(ua.samsung, 5)).toBe("android-samsung");
    expect(platform(ua.mac, 0)).toBe("desktop");
  });
});
