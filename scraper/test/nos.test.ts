import { describe, expect, it } from "vitest";
import { cleanNosTitle, nosFilm, nosLabel, parseNosSessions, type NosMovie, type NosSessionsResponse } from "../src/sources/nos.ts";
import { fixtureJson } from "./helpers.ts";

const sessions = fixtureJson<NosSessionsResponse>("nos/sessions-hungergames.json", "latin1");
const top = fixtureJson<{ data: { movieList: { items: NosMovie[] } } }>("nos/getTopMovies.json");
const film = nosFilm({ uuid: "x", aggregateformatnumber: "agg", title: "The Hunger Games - Amanhecer na Ceifa (IMAX)", originaltitle: "The Hunger Games - Sunrise on the Reaping", duration: "150", detailurl: "/filmes/x.html", portraitimages: { path: "//cdn.nos.pt/p.jpg" } });

describe("NOS", () => {
  const out = parseNosSessions(sessions, film);

  it("decodes Latin-1 day names", () => {
    expect(sessions.days[1]!.name).toBe("Amanhã");
  });

  it("keeps only the 8 AML theaters", () => {
    expect(out.length).toBeGreaterThan(50);
    expect(new Set(out.map((s) => s.cinemaId)).size).toBeLessThanOrEqual(8);
    expect(out.every((s) => s.cinemaId.startsWith("nos-"))).toBe(true);
  });

  it("builds session ticket urls", () => {
    expect(out[0]!.url).toMatch(/^https:\/\/bilheteira\.cinemas\.nos\.pt\/Cinemas\/Ticket\?SessionUUID=[0-9a-f-]{36}$/);
    expect(out.every((s) => s.urlKind === "session")).toBe(true);
  });

  it("labels formats without repeating the room", () => {
    expect(out.some((s) => s.label === "4DX")).toBe(false); // room "Sala 4DX" already says it
    expect(nosLabel({ format: "imax", description: "IMAX" })).toBeUndefined();
    expect(nosLabel({ format: "atmos", description: "Sala 1" })).toBe("Atmos");
    expect(nosLabel({ format: "3d", version: "Dob", description: "Sala 6" })).toBe("3D · VP");
  });

  it("moves after-midnight sessions to the next calendar date, keeping the evening", () => {
    const late = parseNosSessions({ days: [{ name: "Hoje", theaters: [{ theaterId: "e0ea3044-4a1b-46b1-bca2-69fd8eae16d7", name: "Colombo", sessions: [{ uuid: "u", time: "00:15", operationalDate: "2026-11-24Z" }] }] }] }, film);
    expect(late[0]).toMatchObject({ date: "2026-11-25", time: "00:15", programmeDate: "2026-11-24" });
  });

  it("cleans titles", () => {
    expect(cleanNosTitle("O Gato do Chapéu (VP 3D)")).toBe("O Gato do Chapéu");
    expect(cleanNosTitle("Vingadores - Doomsday (3D INIFNITY)")).toBe("Vingadores - Doomsday");
    expect(cleanNosTitle("Floresta Mágica (VO)")).toBe("Floresta Mágica");
    expect(cleanNosTitle("Godzilla Minus Zero ")).toBe("Godzilla Minus Zero");
    expect(cleanNosTitle("Viana - A Lenda dos Corações de Ouro")).toBe("Viana - A Lenda dos Corações de Ouro");
    expect(film).toMatchObject({ title: "The Hunger Games - Amanhecer na Ceifa", runtimeMin: 150, posterUrl: "https://cdn.nos.pt/p.jpg", filmUrl: "https://www.cinemas.nos.pt/filmes/x.html" });
  });

  it("getTopMovies has ordered positions", () => {
    const items = top.data.movieList.items;
    expect(items.length).toBeGreaterThan(10);
    expect(items.every((m) => typeof m.position === "number")).toBe(true);
  });
});
