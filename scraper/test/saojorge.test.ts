import { describe, expect, it } from "vitest";
import { parseSjEvent, parseSjListing, sjSessions } from "../src/sources/saojorge.ts";
import { fixture } from "./helpers.ts";

describe("Cinema São Jorge", () => {
  it("reads the server-rendered programme listing", () => {
    const items = parseSjListing(fixture("saojorge/programacao.html"));
    expect(items).toHaveLength(10);
    expect(items).toContainEqual({ url: "https://cinemasaojorge.pt/evento/damas/", firstDate: "2026-11-26" });
    const p2 = parseSjListing(fixture("saojorge/programacao-page-2.html"));
    expect(p2.length).toBeGreaterThan(0);
    expect(p2[0]!.firstDate >= items.at(-1)!.firstDate).toBe(true);
  });

  it("parses an event page: sessions, room, category, festival, runtime, ticket", () => {
    const ev = parseSjEvent(fixture("saojorge/evento-damas.html"), "https://cinemasaojorge.pt/evento/damas/");
    expect(ev).toMatchObject({
      title: "DAMAS", category: "Sessão de festival", festival: "Olhares do Mediterrâneo - Women’s Film Festival", runtimeMin: 154,
      sessions: [{ date: "2026-11-26", time: "18:00", room: "Sala 2" }],
    });
    expect(ev.ticketUrl).toMatch(/^https:\/\/www\.bol\.pt\/Comprar\/Bilhetes\/188550-/);
  });

  it("emits film sessions with the festival as label; single-session BOL link is a session link", () => {
    const ev = parseSjEvent(fixture("saojorge/evento-damas.html"), "https://cinemasaojorge.pt/evento/damas/");
    const out = sjSessions(ev, "2026-11-24");
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ cinemaId: "sao-jorge", room: "Sala 2", label: "Olhares do Mediterrâneo - Women’s Film Festival", urlKind: "session" });
  });

  it("drops non-film categories and past sessions", () => {
    const ev = parseSjEvent(fixture("saojorge/evento-damas.html"), "x");
    expect(sjSessions({ ...ev, category: "Stand-Up Comedy" }, "2026-11-24")).toHaveLength(0);
    expect(sjSessions(ev, "2026-11-27")).toHaveLength(0);
  });

  it("drops session descriptors after ' | ' but keeps other suffixes", () => {
    const h1 = (t: string) => parseSjEvent(`<h1 class="is-text-heading-1">${t}</h1>`, "https://cinemasaojorge.pt/x").title;
    expect(h1("THE ACCOMPANIST | TRIBECA CINEMA SESSIONS")).toBe("THE ACCOMPANIST");
    expect(h1("NOMAD SHADOW | Sessão de Encerramento")).toBe("NOMAD SHADOW");
    expect(h1("W. Kamau Bell | TRIBECA NIGHT LIVE")).toBe("W. Kamau Bell | TRIBECA NIGHT LIVE");
  });
});
