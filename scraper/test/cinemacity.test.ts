import { describe, expect, it } from "vitest";
import { cleanCinemaCityTitle, parseCinemaCityDates, parseCinemaCityDay } from "../src/sources/cinemacity.ts";
import { fixtureJson } from "./helpers.ts";

const day = (id: string) => fixtureJson<{ htmlresponse: string }>(`cinemacity/menu-${id}-2026-11-24.json`).htmlresponse;

describe("Cinema City", () => {
  it("parses a day timeline with session ticket urls", () => {
    const out = parseCinemaCityDay(day("96"), "2026-11-24");
    expect(out).toHaveLength(14);
    expect(out[0]).toMatchObject({
      cinemaId: "cc-alvalade", date: "2026-11-24", time: "13:15", film: { title: "A PRAGA" },
      url: "https://alvalade.admit-one.eu/?p=tickets&perfCode=119215", urlKind: "session",
    });
  });

  it("maps every cinema by its booking subdomain", () => {
    expect(new Set(parseCinemaCityDay(day("3183"), "2026-11-24").map((s) => s.cinemaId))).toEqual(new Set(["cc-alegro-alfragide"]));
    expect(new Set(parseCinemaCityDay(day("6300511"), "2026-11-24").map((s) => s.cinemaId))).toEqual(new Set(["cc-alegro-setubal"]));
    expect(new Set(parseCinemaCityDay(day("2669"), "2026-11-24").map((s) => s.cinemaId))).toEqual(new Set(["cc-campo-pequeno"]));
  });

  it("turns the BIG badge into a room", () => {
    const out = parseCinemaCityDay(day("3183"), "2026-11-24");
    expect(out.some((s) => s.room === "Sala BIG")).toBe(true);
  });

  it("normalises titles and extracts labels", () => {
    expect(cleanCinemaCityTitle("CHRISTOPHERS, OS")).toEqual({ title: "OS CHRISTOPHERS" });
    expect(cleanCinemaCityTitle("GATO DO CHAPEU, O VP")).toEqual({ title: "O GATO DO CHAPEU", label: "VP" });
    expect(cleanCinemaCityTitle("DUNE PARTE TRES PAID PREVIEW")).toEqual({ title: "DUNE PARTE TRES", label: "Antestreia" });
    expect(cleanCinemaCityTitle("FLORESTA MÁGICA VO")).toEqual({ title: "FLORESTA MÁGICA" });
    expect(cleanCinemaCityTitle("THE HUNGER GAMES: AMANHECER NA CEIFA")).toEqual({ title: "THE HUNGER GAMES: AMANHECER NA CEIFA" });
  });

  it("reads the date list including scattered pre-sale dates", () => {
    const dates = parseCinemaCityDates(fixtureJson<{ htmlresponse: string }>("cinemacity/dates-3183.json").htmlresponse);
    expect(dates[0]).toBe("2026-11-24");
    expect(dates).toContain("2026-12-22");
  });
});
