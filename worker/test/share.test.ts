import { describe, expect, it } from "vitest";
import { extractObject, sharePage, whenLabel } from "../src/share.ts";

const programme = JSON.stringify({
  generatedAt: "2026-11-27T07:00:00Z",
  films: [{ key: "tmdb-1300968", title: "The Hunger Games - Amanhecer na Ceifa", posterUrl: "https://image.tmdb.org/t/p/w342/x.jpg" }, { key: "t-a}b", title: "A } B" }],
  sessions: [{ id: "4705c1e8228e", filmKey: "tmdb-1300968", cinemaId: "nos-odivelas-strada", startsAt: "2026-11-27T21:30:00+00:00", programmeDate: "2026-11-27", room: "Sala 2", url: "https://x", urlKind: "session" }],
});

describe("share links", () => {
  it("pulls one flat object out of the programme text, even with a } inside a string", () => {
    expect(extractObject<{ title: string }>(programme, '{"key":"t-a}b"')?.title).toBe("A } B");
    expect(extractObject(programme, '{"id":"nope"')).toBeUndefined();
  });

  it("builds the WhatsApp preview and the redirect into the app", () => {
    const html = sharePage(programme, "4705c1e8228e", "https://eden.zeorey.workers.dev")!;
    expect(html).toContain('<meta property="og:title" content="The Hunger Games - Amanhecer na Ceifa · sex 27 nov · 21:30">');
    expect(html).toContain('og:image" content="https://image.tmdb.org/t/p/w342/x.jpg"');
    expect(html).toContain("Cinemas NOS Odivelas Strada · Sala 2 — eden");
    expect(html).toContain("/?filme=tmdb-1300968&amp;dia=2026-11-27&amp;sessao=4705c1e8228e");
  });

  it("refuses odd ids and unknown sessions", () => {
    expect(sharePage(programme, "<script>", "https://e")).toBeUndefined();
    expect(sharePage(programme, "abcdef123456", "https://e")).toBeUndefined();
  });

  it("labels the day in Portuguese", () => {
    expect(whenLabel({ startsAt: "2026-11-28T00:30:00+00:00", programmeDate: "2026-11-27" } as never)).toBe("sex 27 nov · 00:30");
  });
});
