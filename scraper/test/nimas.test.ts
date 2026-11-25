import { describe, expect, it } from "vitest";
import { parseNimas } from "../src/sources/nimas.ts";
import { fixture } from "./helpers.ts";

describe("Nimas", () => {
  const out = parseNimas(fixture("nimas/nimas.html"));

  it("parses every scheduled film across ~23 days", () => {
    expect(out.length).toBe(112);
    const dates = [...new Set(out.map((s) => s.date))].sort();
    expect(dates[0]).toBe("2026-11-24");
    expect(dates.at(-1)).toBe("2026-12-16");
  });

  it("reads title, director, runtime, year from slug, film url", () => {
    expect(out[0]).toMatchObject({
      date: "2026-11-24", time: "13:00", cinemaId: "nimas", urlKind: "film",
      url: "https://medeiafilmes.com/filmes/you-can-see-everything-2026",
      film: { title: "You Can See Everything", director: "Nathan Fielder, Lance Oppenheim", runtimeMin: 174, year: 2026 },
    });
  });

  it("labels cycles without the 'Ciclo' prefix", () => {
    const cw = out.find((s) => s.film.title === "Certain Women");
    expect(cw).toMatchObject({ label: "LEFFEST – Continuação", film: { year: 2016 } });
  });

  it("sorts times within a day", () => {
    const day = out.filter((s) => s.date === "2026-11-24").map((s) => s.time);
    expect(day).toEqual([...day].sort());
  });
});
