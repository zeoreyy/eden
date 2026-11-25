import { describe, expect, it } from "vitest";
import { buildFlSessions, matchSlug, parseFlFilmPage, parseFlProgramme, parseFlSlugs } from "../src/sources/fernandolopes.ts";
import { fixture } from "./helpers.ts";

const TODAY = "2026-11-24";
const programme = parseFlProgramme(fixture("fernandolopes/Programacao.html"), TODAY);

describe("Fernando Lopes", () => {
  it("parses the hand-typed programme, tolerating missing spaces before the dash", () => {
    expect(programme).toHaveLength(27);
    expect(programme[0]).toEqual({ date: "2026-11-24", time: "19:00", title: "PSICOPATA VITORIANA", label: undefined });
    expect(programme.find((p) => p.title === "TRAINSPOTTING")).toMatchObject({ date: "2026-11-29", time: "19:00" }); // "19h00- TRAINSPOTTING"
    expect(programme.at(-1)).toMatchObject({ date: "2026-12-02", time: "22:30" });
  });

  it("splits cycle / special-session labels but keeps dashes inside titles", () => {
    expect(programme.find((p) => p.title === "A SEMENTE DO FIGO SAGRADO")?.label).toBe("Ciclo Cinema e Direito");
    expect(programme.find((p) => p.label === "Sessão especial")?.title).toBe("CONVERSA-AÇORDA");
    expect(programme.some((p) => p.title === "NEW DYSTOPIAS - TWO PEOPLE EXCHANGING SALIVA AND OTHER SHORTS")).toBe(true);
  });

  it("reads film pages: title, year, runtime, director, ticket link, sessions", () => {
    const p = parseFlFilmPage(fixture("fernandolopes/FATHERLAND.html"), "FATHERLAND", TODAY);
    expect(p.film).toMatchObject({ title: "Fatherland", year: 2026, runtimeMin: 82, director: "Paweł Pawlikowski", filmUrl: "https://cinemafernandolopes.pt/FATHERLAND" });
    expect(p.ticketUrl).toBe("https://www.ticketline.pt/pt/evento/fatherland-110055");
    expect(p.sessions[0]).toEqual({ date: "2026-11-26", time: "19:30" });
    expect(p.sessions).toHaveLength(6);
  });

  it("takes the ticket link from the buy button, not stray links to other events", () => {
    const p = parseFlFilmPage(fixture("fernandolopes/NEW-DYSTOPIAS-TWO-PEOPLE-EXCHANGING-SALIVA.html"), "NEW-DYSTOPIAS-TWO-PEOPLE-EXCHANGING-SALIVA", TODAY);
    expect(p.ticketUrl).toBe("https://www.ticketline.pt/evento/new-dystopias-two-peopleexchanging-saliva-109134");
  });

  it("fuzzy-matches typed titles to page slugs", () => {
    const slugs = parseFlSlugs(fixture("fernandolopes/Filmes-1.html"));
    expect(matchSlug("PSICOPATA VITORIANA", slugs)).toBe("PSICOPATA-VICTORIANA");
    expect(matchSlug("CONVERSA-AÇORDA", slugs)).toBe("CONVERSA-ACORDA");
    expect(matchSlug("TRAINSPOTTING", slugs)).toBe("TRAINSPOTTING");
    expect(matchSlug("A SEMENTE DO FIGO SAGRADO", slugs)).toBeUndefined();
  });

  it("links sessions to Ticketline when the film page has it, else film page, else programme", () => {
    const slugs = parseFlSlugs(fixture("fernandolopes/Filmes-1.html"));
    const page = parseFlFilmPage(fixture("fernandolopes/FATHERLAND.html"), "FATHERLAND", TODAY);
    const out = buildFlSessions(programme, new Map([["FATHERLAND", page]]), slugs);
    expect(out.find((s) => s.film.title === "FATHERLAND")).toMatchObject({ url: "https://www.ticketline.pt/pt/evento/fatherland-110055", urlKind: "film", film: { year: 2026 } });
    // NAZA's page wasn't loaded in this test → no guessed URL, fall back to the programme page.
    expect(out.find((s) => s.film.title === "NAZA")).toMatchObject({ url: "https://cinemafernandolopes.pt/Programacao", urlKind: "venue" });
    expect(matchSlug("NEW DYSTOPIAS - TWO PEOPLE EXCHANGING SALIVA AND OTHER SHORTS", slugs)).toBe("NEW-DYSTOPIAS-TWO-PEOPLE-EXCHANGING-SALIVA");
    expect(out.find((s) => s.film.title === "A SEMENTE DO FIGO SAGRADO")).toMatchObject({ url: "https://cinemafernandolopes.pt/Programacao", urlKind: "venue" });
  });
});
