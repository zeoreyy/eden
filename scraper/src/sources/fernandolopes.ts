// Cinema Fernando Lopes — hand-typed Cargo site (docs/sources.md §8).
// Programme page = authoritative list; film pages add year/runtime/director, the Ticketline
// link, and sessions beyond the programme's horizon.
import { politeFetch } from "../http.ts";
import type { RawFilm, RawSession, SourceResult } from "../types.ts";
import { htmlLines, inferYear, levenshtein, lisbonToday, parseTime, ptMonth, squash } from "../util.ts";

const BASE = "https://cinemafernandolopes.pt";
const PROGRAMME = `${BASE}/Programacao`;
const DAY = /^(?:seg|ter|qua|qui|sex|s[áa]b|dom)[a-zçá-]*,?\s+(\d{1,2})\s+([a-zç]+)/i;
// Label suffixes the cinema appends: "- Ciclo Cinema e Direito", "- sessão especial".
const LABEL = /\s+[-–]\s+((?:Ciclo|Sess[ãa]o|Antestreia|Ante-estreia|Mostra|Festival|Semana|com)\b.*)$/i;
const NAV = new Set(["Bilheteira", "Contacto", "Filmes-1", "Homepage", "Programacao", "Screenings-With-English-Subtitles", "Sessoes-Especiais", "Nav", "footer"]);

export interface FlProgrammeItem { date: string; time: string; title: string; label?: string }

export function parseFlProgramme(html: string, today: string): FlProgrammeItem[] {
  const out: FlProgrammeItem[] = [];
  let date: string | null = null;
  for (const line of htmlLines(html)) {
    const d = line.match(DAY);
    if (d) {
      const month = ptMonth(d[2]!);
      date = month ? inferYear(Number(d[1]), month, today) : null;
      continue;
    }
    const s = line.match(/^(\d{1,2}\s*h\s*\d{2})\s*[-–]\s*(.+)$/i);
    if (!s || !date) continue;
    const time = parseTime(s[1]!.replace(/\s/g, ""));
    if (!time) continue;
    let title = s[2]!.trim();
    const l = title.match(LABEL);
    let label: string | undefined;
    if (l) {
      title = title.slice(0, l.index).trim();
      label = l[1]!.trim();
      label = label.charAt(0).toUpperCase() + label.slice(1);
    }
    out.push({ date, time, title, label });
  }
  return out;
}

/** Film-page slugs linked from a page (uppercase Cargo page names). */
export function parseFlSlugs(html: string): string[] {
  const slugs = [...html.matchAll(/href="([A-Z0-9][A-Za-z0-9-]*)"/g)].map((m) => m[1]!);
  return [...new Set(slugs)].filter((s) => !NAV.has(s) && s === s.toUpperCase());
}

export interface FlFilmPage { slug: string; film: RawFilm; ticketUrl?: string; sessions: { date: string; time: string }[] }

export function parseFlFilmPage(html: string, slug: string, today: string): FlFilmPage {
  const lines = htmlLines(html);
  const film: RawFilm = { title: slug.replace(/-/g, " "), filmUrl: `${BASE}/${slug}` };
  const metaIdx = lines.findIndex((l) => /^\d{4}\s*\/.*\/\s*\d+\s*MIN/i.test(l));
  if (metaIdx > 0) {
    film.title = lines[metaIdx - 1]!;
    film.year = Number(lines[metaIdx]!.match(/^(\d{4})/)![1]);
    film.runtimeMin = Number(lines[metaIdx]!.match(/(\d+)\s*MIN/i)![1]);
  }
  const dirIdx = lines.findIndex((l) => /^REALIZA[ÇC][ÃA]O$/i.test(l));
  if (dirIdx >= 0 && lines[dirIdx + 1]) film.director = lines[dirIdx + 1];
  const sessions: { date: string; time: string }[] = [];
  for (const l of lines) {
    // "qui, 26 nov | 19h30" — the weekday is sometimes omitted ("28 nov | 19h00").
    const m = l.match(/^(?:(?:seg|ter|qua|qui|sex|s[áa]b|dom)[a-zçá-]*,?\s+)?(\d{1,2})\s+([a-zç]+)\s*\|\s*(\d{1,2}h\d{2})/i);
    const month = m && ptMonth(m[2]!);
    const time = m && parseTime(m[3]!);
    if (m && month && time) sessions.push({ date: inferYear(Number(m[1]), month, today), time });
  }
  // Pages can carry other events' Ticketline links (shared blocks); use the "+ COMPRAR BILHETES" button's.
  const buttons = [...html.matchAll(/<a[^>]*href="(https:\/\/www\.ticketline\.pt\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/g)]
    .filter((m) => /COMPRAR\s+BILHETES/i.test(m[2]!.replace(/<[^>]+>/g, "")))
    .map((m) => m[1]!);
  const ticketUrl = buttons[0];
  return { slug, film, ticketUrl, sessions };
}

/** Programme titles are hand-typed ("PSICOPATA VITORIANA" vs slug "PSICOPATA-VICTORIANA"): fuzzy match. */
export function matchSlug(title: string, slugs: string[]): string | undefined {
  const t = squash(title);
  // Long titles are often truncated in the slug ("NEW-DYSTOPIAS-TWO-PEOPLE-EXCHANGING-SALIVA").
  const prefix = slugs.find((s) => squash(s).length >= 16 && t.startsWith(squash(s)));
  if (prefix) return prefix;
  let best: { slug: string; d: number } | undefined;
  for (const s of slugs) {
    const d = levenshtein(t, squash(s));
    if (!best || d < best.d) best = { slug: s, d };
  }
  return best && best.d <= Math.max(1, Math.floor(t.length / 8)) ? best.slug : undefined;
}

export function buildFlSessions(programme: FlProgrammeItem[], pages: Map<string, FlFilmPage>, allSlugs: string[]): RawSession[] {
  const out: RawSession[] = [];
  const seen = new Set<string>();
  const lastProgDate = programme.map((p) => p.date).sort().at(-1) ?? "";
  for (const p of programme) {
    const slug = matchSlug(p.title, allSlugs);
    const page = slug ? pages.get(slug) : undefined;
    // Only link a film page we actually loaded (some linked pages 404) — never a guessed URL.
    const film: RawFilm = page ? { ...page.film, title: p.title } : { title: p.title };
    const url = page?.ticketUrl ?? film.filmUrl ?? PROGRAMME;
    out.push({
      source: "fernandolopes", cinemaId: "fernando-lopes", date: p.date, time: p.time, film, label: p.label,
      url, urlKind: film.filmUrl ? "film" : "venue",
    });
    seen.add(`${slug ?? p.title}|${p.date}|${p.time}`);
  }
  // Film pages often list sessions further ahead than the programme page.
  for (const page of pages.values()) {
    for (const s of page.sessions) {
      if (s.date <= lastProgDate || seen.has(`${page.slug}|${s.date}|${s.time}`)) continue;
      seen.add(`${page.slug}|${s.date}|${s.time}`);
      out.push({
        source: "fernandolopes", cinemaId: "fernando-lopes", date: s.date, time: s.time, film: page.film,
        url: page.ticketUrl ?? page.film.filmUrl!, urlKind: "film",
      });
    }
  }
  return out.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}

export async function scrapeFernandoLopes(today = lisbonToday()): Promise<SourceResult> {
  const warnings: string[] = [];
  const get = async (path: string) => (await politeFetch(`${BASE}/${path}`)).text();
  const programme = parseFlProgramme(await get("Programacao"), today);
  const current = parseFlSlugs(await get(""));
  const archive = [...parseFlSlugs(await get("Filmes-1")), ...parseFlSlugs(await get("Sessoes-Especiais"))];
  const allSlugs = [...new Set([...current, ...archive])];
  // Fetch pages for current films and for every film named in the programme.
  const inProgramme = new Set<string>();
  for (const p of programme) {
    const s = matchSlug(p.title, allSlugs);
    if (s) inProgramme.add(s);
    else warnings.push(`no film page for "${p.title}" → programme link`);
  }
  const pages = new Map<string, FlFilmPage>();
  for (const slug of new Set([...inProgramme, ...current])) {
    try {
      pages.set(slug, parseFlFilmPage(await get(slug), slug, today));
    } catch (e) {
      // Homepage "coming soon" tiles link to unpublished pages (404) — only worth a warning if programmed.
      if (inProgramme.has(slug)) warnings.push(`${slug}: ${(e as Error).message}`);
    }
  }
  const sessions = buildFlSessions(programme, pages, allSlugs);
  return { source: "fernandolopes", sessions, warnings: [...new Set(warnings)] };
}
