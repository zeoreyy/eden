import { describe, expect, it } from "vitest";
import { CINEMAS } from "@eden/shared";

describe("cinema config", () => {
  it("has exactly 19 cinemas with unique ids", () => {
    expect(CINEMAS).toHaveLength(19);
    expect(new Set(CINEMAS.map((c) => c.id)).size).toBe(19);
  });
  it("splits 14 commercial / 5 arthouse", () => {
    expect(CINEMAS.filter((c) => c.kind === "commercial")).toHaveLength(14);
    expect(CINEMAS.filter((c) => c.kind === "arthouse")).toHaveLength(5);
  });
  it("has https venue urls", () => {
    for (const c of CINEMAS) expect(c.url).toMatch(/^https:\/\//);
  });
});
