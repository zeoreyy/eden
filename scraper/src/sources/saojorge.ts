// Cinema São Jorge — WordPress (docs/sources.md §5).
// The server-rendered /programacao/page/N/ lists upcoming events in date order; each event page
// has its sessions (date, time, room), category, festival tag, runtime and BOL ticket link.
// Not used: the site's admin-ajax listing (needs a nonce scraped from the page — token reuse).
import { politeFetch } from "../http.ts";
import type { RawSession, SourceResult } from "../types.ts";
import { addDays, clean, lisbonToday } from "../util.ts";

const BASE = "https://cinemasaojorge.pt";
// Categories that are film screenings (sources.md). Others: concerts, stand-up, workshops, debates…
const FILM_CATEGORIES = new Set(["Cinema", "Filme", "Sessão de festival", "Sessão Especial", "Mostra de cinema"]);

export interface SjListItem { url: string; firstDate: string }

export function parseSjListing(html: string): SjListItem[] {
  const out: SjListItem[] = [];
  for (const card of html.split('<li class="card_wrapper').slice(1)) {
    const url = card.match(/href="(https:\/\/cinemasaojorge\.pt\/evento\/[^"]+\/)"[^>]*aria-label="Ver Detalhe/)?.[1]
      ?? card.match(/aria-label="Ver Detalhe[^"]*" href="(https:\/\/cinemasaojorge\.pt\/evento\/[^"]+\/)"/)?.[1];
    const date = card.match(/<time[^>]*datetime="(\d{4}-\d{2}-\d{2})/)?.[1];
    if (url && date) out.push({ url, firstDate: date });
  }
  return out;
}

export interface SjEvent {
  url: string;
  title: string;
  category?: string;
  festival?: string;
  runtimeMin?: number;
  ticketUrl?: string;
  sessions: { date: string; time: string; room?: string }[];
}

export function parseSjEvent(html: string, url: string): SjEvent {
  // "THE ACCOMPANIST | TRIBECA CINEMA SESSIONS", "NOMAD SHADOW | Sessão de Encerramento" → film title only
  // (the festival is already the label). "W. Kamau Bell | TRIBECA NIGHT LIVE" keeps its suffix.
  const title = clean(html.match(/<h1 class="is-text-heading[^"]*">([\s\S]*?)<\/h1>/)?.[1])
    .replace(/\s+\|\s+[^|]*(?:sess|abertura|encerramento)[^|]*$/i, "");
  const category = clean(html.match(/<li aria-label="Categoria do evento">([\s\S]*?)<\/li>/)?.[1]) || undefined;
  const festival = clean(html.match(/<a href="[^"]*" class="tag[^"]*">\s*<span>([\s\S]*?)<\/span>/)?.[1]) || undefined;
  const runtime = html.match(/<li aria-label="Dura[çc][ãa]o">\s*(\d{1,3})/)?.[1];
  // The buy button wraps an icon <span> before its text.
  const ticketUrl = html.match(/href="(https:\/\/(?:www\.)?bol\.pt\/Comprar\/Bilhetes\/[^"]+)"[^>]*>(?:\s*<span[^>]*><\/span>)?\s*Comprar bilhetes/i)?.[1];
  const sessions: SjEvent["sessions"] = [];
  const block = html.match(/aria-label="Informações de data e local">([\s\S]*?)<\/ul>/)?.[1] ?? "";
  for (const li of block.split("<li").slice(1)) {
    const date = li.match(/<time datetime="(\d{4}-\d{2}-\d{2})">/)?.[1];
    const time = li.match(/<time datetime="(\d{1,2}:\d{2})">/)?.[1];
    const room = li.match(/<\/time>\s*\|\s*([^<]+?)\s*<\/span>/)?.[1]?.trim();
    if (date && time) sessions.push({ date, time: time.padStart(5, "0"), room: room || undefined });
  }
  return { url, title, category, festival, runtimeMin: runtime ? Number(runtime) : undefined, ticketUrl, sessions };
}

export function sjSessions(ev: SjEvent, today: string): RawSession[] {
  if (!ev.category || !FILM_CATEGORIES.has(ev.category)) return [];
  const upcoming = ev.sessions.filter((s) => s.date >= today);
  // One BOL page per event: it is the session's page only when the event has a single session.
  const urlKind = ev.ticketUrl ? (ev.sessions.length === 1 ? "session" : "film") : "film";
  return upcoming.map((s) => ({
    source: "saojorge" as const,
    cinemaId: "sao-jorge",
    date: s.date,
    time: s.time,
    film: { title: ev.title, runtimeMin: ev.runtimeMin, filmUrl: ev.url },
    room: s.room,
    label: ev.festival ?? (ev.category === "Sessão Especial" ? "Sessão especial" : undefined),
    url: ev.ticketUrl ?? ev.url,
    urlKind,
  }));
}

export async function scrapeSaoJorge(today = lisbonToday(), horizonDays = 30): Promise<SourceResult> {
  const warnings: string[] = [];
  const horizon = addDays(today, horizonDays);
  const events = new Set<string>();
  for (let page = 1; page <= 15; page++) {
    const html = await (await politeFetch(`${BASE}/programacao/${page > 1 ? `page/${page}/` : ""}`)).text();
    const items = parseSjListing(html);
    if (!items.length) break;
    for (const it of items) if (it.firstDate <= horizon) events.add(it.url);
    if (items.every((it) => it.firstDate > horizon)) break;
  }
  const sessions: RawSession[] = [];
  for (const url of events) {
    try {
      const ev = parseSjEvent(await (await politeFetch(url)).text(), url);
      sessions.push(...sjSessions(ev, today));
    } catch (e) {
      warnings.push(`${url}: ${(e as Error).message}`);
    }
  }
  return { source: "saojorge", sessions, warnings, extras: { eventsChecked: events.size } };
}
