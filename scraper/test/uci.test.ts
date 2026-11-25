import { describe, expect, it } from "vitest";
import { detectUciBlock } from "../src/sources/uci.ts";
import { fixture } from "./helpers.ts";

describe("UCI", () => {
  it("recognises the Cloudflare challenge page a headless visitor gets", () => {
    const html = fixture("uci/challenge-el-corte-ingles.html");
    expect(detectUciBlock("https://www.ucicinemas.pt/cinemas/el-corte-ingles/", "Um momento…", html)).toBe("cloudflare-challenge");
  });

  it("recognises a Queue-it redirect", () => {
    expect(detectUciBlock("https://uciportugal.queue-it.net/?c=uciportugal&e=684357", "", "")).toBe("queue-it");
  });

  it("recognises Cloudflare's hard block page (GitHub Actions, 25 Nov 2026)", () => {
    expect(detectUciBlock("https://www.ucicinemas.pt/cinemas/ubbo/", "Attention Required! | Cloudflare", "<h1>Sorry, you have been blocked</h1>")).toBe("cloudflare-block");
  });

  it("does not flag a normal page", () => {
    expect(detectUciBlock("https://www.ucicinemas.pt/cinemas/el-corte-ingles/", "UCI El Corte Inglés", "<html></html>")).toBeNull();
  });
});
