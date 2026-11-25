// Cinema Medeia Nimas — server-rendered page, one section per day (docs/sources.md §6).
import { politeFetch } from "../http.ts";
import type { RawSession, SourceResult } from "../types.ts";
import { clean } from "../util.ts";

const PAGE = "https://medeiafilmes.com/cinemas/cinema-medeia-nimas";

export function parseNimas(html: string): RawSession[] {
  const out: RawSession[] = [];
  // Day sections start at their sticky header; the last chunk ends at the page footer.
  const days = html.split(/<header[^>]*data-sticky-slug="(\d{4}-\d{2}-\d{2})"[^>]*>/);
  for (let i = 1; i < days.length; i += 2) {
    const date = days[i]!;
    const body = days[i + 1]!;
    for (const art of body.split('<article class="schedule').slice(1)) {
      const time = art.match(/<h3 class="t-headline t-headline--large-alt">\s*(\d{1,2}:\d{2})\s*<\/h3>/)?.[1];
      if (!time) continue;
      // Only a film's first appearance on the page carries id="slug"; later ones are <div  class=…>.
      for (const g of art.split(/<div\s+(?:id="[^"]*"\s+)?class="schedule-group\s/).slice(1)) {
        const link = g.match(/<a class="h-link" href="(https:\/\/medeiafilmes\.com\/filmes\/([^"]+))">([\s\S]*?)<\/a>/);
        if (!link) continue;
        const filmUrl = link[1]!;
        const year = Number(link[2]!.match(/-(\d{4})$/)?.[1]) || undefined;
        const director = clean(g.match(/<b class="t-semi">\s*de\s+([\s\S]*?)<\/b>/)?.[1]) || undefined;
        const rt = g.match(/<li>\s*(\d{1,2})h(\d{2})\s*(?:&nbsp;|<)/);
        const runtimeMin = rt ? Number(rt[1]) * 60 + Number(rt[2]) : undefined;
        const cycleRaw = clean(g.match(/href="https:\/\/medeiafilmes\.com\/ciclos\/[^"]+">([\s\S]*?)<\/a>/)?.[1]);
        const label = cycleRaw.replace(/^Ciclo\s+/i, "").replace(/^["“]|["”]$/g, "").trim() || undefined;
        const poster = g.match(/data-src="(https:\/\/medeiafilmes\.com\/uploads\/[^"]+)"/)?.[1];
        out.push({
          source: "nimas",
          cinemaId: "nimas",
          date,
          time: time.padStart(5, "0"),
          film: { title: clean(link[3]), year, runtimeMin, director, posterUrl: poster, filmUrl },
          label,
          url: filmUrl, // tickets are venue-level only (ActiveTicket) → link the film page
          urlKind: "film",
        });
      }
    }
  }
  return out;
}

export async function scrapeNimas(): Promise<SourceResult> {
  const html = await (await politeFetch(PAGE)).text();
  const sessions = parseNimas(html);
  return { source: "nimas", sessions, warnings: sessions.length ? [] : ["no sessions found"] };
}
