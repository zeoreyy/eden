// Cinemateca Portuguesa — server-rendered ASP.NET, one page per day (docs/sources.md §4).
import { politeFetch } from "../http.ts";
import type { RawSession, SourceResult } from "../types.ts";
import { addDays, clean, lisbonToday, parseTime } from "../util.ts";

const BASE = "https://www.cinemateca.pt/Programacao.aspx";

/**
 * A day page has a left list (one <a href="?id=…&date=…"> per session) and a right detail column
 * repeating every session with its BOL ticket link. Pair them by the "DD/MM/YYYY, HHhMM | Sala …" line.
 */
/** Programmes sometimes prefix their cycle in caps: "CICLO PEQUENA HISTÓRIA DO CINEMA Os Mestres do Riso… | …". */
export function stripCyclePrefix(title: string): string {
  return title.replace(/^CICLO\s+(?:[A-ZÀ-Ý]+\s+)+(?=[A-ZÀ-Ý][a-zà-ÿ])/, "");
}

export function parseCinemateca(html: string): RawSession[] {
  const tickets = new Map<string, string>();
  const detailStart = html.indexOf('class="infoDetail"');
  if (detailStart >= 0) {
    // Each detail block starts at a date line; a second "infoDate" div holds the cycle, so split on dates only.
    const blocks = html.slice(detailStart).split(/<div class="infoDate">(?=\d{2}\/\d{2}\/\d{4},)/).slice(1);
    for (const b of blocks) {
      const key = clean(b.slice(0, b.indexOf("</div>")));
      const bol = b.match(/href="(https:\/\/cinemateca\.bol\.pt\/Comprar\/Bilhetes\/[^"]+)"/);
      if (bol && !tickets.has(key)) tickets.set(key, bol[1]!);
    }
  }

  const out: RawSession[] = [];
  const seen = new Set<string>();
  const items = html.matchAll(/<a href="\?id=(\d+)&(?:amp;)?date=(\d{4}-\d{2}-\d{2})"><div class="lista">([\s\S]*?)<\/a>/g);
  for (const [, id, date, body] of items) {
    if (seen.has(id!)) continue; // list + detail duplicates → dedupe by session id
    seen.add(id!);
    const infoDate = clean(body!.match(/class="infoDate[^"]*">([^<]+)</)?.[1]);
    const m = infoDate.match(/^(\d{2})\/(\d{2})\/(\d{4}),\s*(\d{1,2}h\d{2})\s*\|\s*(.+)$/);
    if (!m) continue;
    const time = parseTime(m[4]!);
    if (!time) continue;
    const titles = [...body!.matchAll(/<div class="infoTitle[^"]*">([\s\S]*?)<\/div>/g)].map((t) => stripCyclePrefix(clean(t[1])));
    const original = titles[0] ?? "";
    const pt = (titles[1] ?? "").replace(/^[“"]|[”"]$/g, "").trim();
    const biblio = [...body!.matchAll(/<div class="infoBiblio[^"]*">([\s\S]*?)<\/div>/g)].map((t) => clean(t[1]));
    const cycle = biblio.find((b) => b.startsWith("Ciclo "))?.replace(/^Ciclo\s+/, "");
    const director = biblio.find((b) => b.startsWith("de "))?.replace(/^de\s+/, "");
    const meta = biblio.find((b) => /\d{4}\s*-\s*\d+\s*min/.test(b)) ?? "";
    const year = Number(meta.match(/(\d{4})\s*-\s*\d+\s*min/)?.[1]) || undefined;
    const runtimeMin = Number(meta.match(/(\d+)\s*min/)?.[1]) || undefined;
    const isBundle = original.includes(" | ");
    const detailUrl = `${BASE}?id=${id}&date=${date}`;
    const ticket = tickets.get(infoDate);
    out.push({
      source: "cinemateca",
      cinemaId: "cinemateca",
      date: `${m[3]}-${m[2]}-${m[1]}`,
      time,
      film: {
        title: pt || titleCase(original),
        originalTitle: original || undefined,
        // Bundles of shorts are one programme item: no single year/runtime to match on.
        year: isBundle ? undefined : year,
        runtimeMin: isBundle ? undefined : runtimeMin,
        director,
        filmUrl: detailUrl,
      },
      room: m[5]!.trim(),
      label: cycle,
      url: ticket ?? detailUrl,
      urlKind: "session",
      sourceSessionId: id,
    });
    void date;
  }
  return out;
}

/** Cinemateca prints original titles in caps; only used when there is no PT title. */
function titleCase(s: string): string {
  return s.toLowerCase().replace(/(^|[\s(“"'-])(\p{L})/gu, (_, p: string, c: string) => p + c.toUpperCase());
}

export async function scrapeCinemateca(today = lisbonToday()): Promise<SourceResult> {
  const sessions: RawSession[] = [];
  const warnings: string[] = [];
  const monthEnd = `${today.slice(0, 7)}-31`;
  let emptyRun = 0;
  // Programme is monthly; next month appears near month end. Walk days until 3 empty days past month end.
  for (let i = 0; i < 40; i++) {
    const d = addDays(today, i);
    const html = await (await politeFetch(`${BASE}?date=${d}`)).text();
    const day = parseCinemateca(html).filter((s) => s.date === d);
    sessions.push(...day);
    emptyRun = day.length ? 0 : emptyRun + 1;
    if (d > monthEnd && emptyRun >= 3) break;
  }
  if (!sessions.length) warnings.push("no sessions found");
  return { source: "cinemateca", sessions, warnings };
}
