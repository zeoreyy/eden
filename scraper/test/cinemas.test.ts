import { describe, expect, it } from "vitest";
import { CENTRE_OUT, CINEMAS } from "@eden/shared";

describe("cinema config", () => {
  it("has exactly 19 cinemas with unique ids", () => {
    expect(CINEMAS).toHaveLength(19);
    expect(new Set(CINEMAS.map((c) => c.id)).size).toBe(19);
  });
  it("splits 14 commercial / 5 arthouse", () => {
    expect(CINEMAS.filter((c) => c.kind === "commercial")).toHaveLength(14);
    expect(CINEMAS.filter((c) => c.kind === "arthouse")).toHaveLength(5);
  });
  it("ranks every cinema centre-out, UCIs last", () => {
    expect([...CENTRE_OUT].sort()).toEqual(CINEMAS.map((c) => c.id).sort());
    expect(CENTRE_OUT.slice(-2)).toEqual(["uci-el-corte-ingles", "uci-ubbo"]);
  });
  it("has https venue urls", () => {
    for (const c of CINEMAS) expect(c.url).toMatch(/^https:\/\//);
  });
});
