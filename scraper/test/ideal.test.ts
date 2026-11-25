import { describe, expect, it } from "vitest";
import { parseIdeal, type IdealSession } from "../src/sources/ideal.ts";
import { fixtureJson } from "./helpers.ts";

const items = fixtureJson<IdealSession[]>("ideal/sessions.json");

describe("Cinema Ideal", () => {
  const out = parseIdeal(items);

  it("parses every public session", () => {
    expect(out.length).toBe(items.filter((s) => !s.isPrivate).length);
    expect(out.length).toBeGreaterThan(10);
  });

  it("splits Lisbon local date and time", () => {
    expect(out[0]).toMatchObject({ date: "2026-11-24", time: "14:00", cinemaId: "ideal" });
  });

  it("links to the film in the official booking app", () => {
    expect(out[0]!.url).toMatch(/^https:\/\/bilheteira\.cinemaidealemcasa\.pt\/\?movieid=\d+$/);
    expect(out[0]!.urlKind).toBe("film");
  });

  it("drops private sessions", () => {
    const priv = { ...items[0]!, isPrivate: true };
    expect(parseIdeal([priv])).toHaveLength(0);
  });
});
