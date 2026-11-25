import { describe, expect, it } from "vitest";
import { parseCinemateca, stripCyclePrefix } from "../src/sources/cinemateca.ts";
import { fixture } from "./helpers.ts";

describe("Cinemateca", () => {
  const out = parseCinemateca(fixture("cinemateca/2026-11-24.html"));

  it("parses the day's sessions once each", () => {
    expect(out).toHaveLength(4);
    expect(new Set(out.map((s) => s.sourceSessionId)).size).toBe(4);
  });

  it("reads time, room, cycle, titles, year, runtime", () => {
    expect(out[0]).toMatchObject({
      date: "2026-11-24", time: "15:30", room: "Sala M. Félix Ribeiro",
      label: "Correspondências - Rita Azevedo Gomes | Realizadora Convidada",
      film: { title: "A Vida de O’Haru", originalTitle: "SAIKAKU ICHIDAI ONNA", director: "Kenji Mizoguchi", year: 1952, runtimeMin: 136 },
    });
  });

  it("handles multi-country meta lines", () => {
    expect(out[2]!.film).toMatchObject({ year: 2025, runtimeMin: 108 });
  });

  it("links each session to its BOL ticket page", () => {
    expect(out[0]!.url).toBe("https://cinemateca.bol.pt/Comprar/Bilhetes/188109-rita_azevedo_gomes_saikaku_ichidai_onna-cinemateca/");
    expect(out[1]!.url).toContain("188021-rita_azevedo_gomes_midaregumo");
    expect(out.every((s) => s.urlKind === "session")).toBe(true);
  });

  it("parses another day", () => {
    const d = parseCinemateca(fixture("cinemateca/2026-11-30.html"));
    expect(d).toHaveLength(4);
    expect(d.every((s) => s.date === "2026-11-30")).toBe(true);
  });

  it("drops a caps cycle prefix from programme titles", () => {
    expect(stripCyclePrefix("CICLO PEQUENA HISTÓRIA DO CINEMA Os Mestres do Riso da Época do Mudo | O Aventureiro"))
      .toBe("Os Mestres do Riso da Época do Mudo | O Aventureiro");
    expect(stripCyclePrefix("A Mulher Que Viveu Duas Vezes")).toBe("A Mulher Que Viveu Duas Vezes");
  });
});
