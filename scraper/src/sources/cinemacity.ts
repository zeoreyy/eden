// Cinema City — the site's own AJAX day timeline (docs/sources.md §3).
import { cinemasForSource } from "@eden/shared";
import { politeFetch } from "../http.ts";
import type { RawSession, SourceResult } from "../types.ts";
import { clean } from "../util.ts";

const AJAX = "https://www.cinemacity.pt/ajaxHandler.ud121";
// Booking subdomain → our cinema id (from the ticket URLs in the timeline).
const SUBDOMAIN: Record<string, string> = {
  alfragide: "cc-alegro-alfragide",
  setubal: "cc-alegro-setubal",
  alvalade: "cc-alvalade",
  campo: "cc-campo-pequeno",
};

/** "CHRISTOPHERS, OS" → "OS CHRISTOPHERS"; strips VP/VO/PAID PREVIEW suffixes and returns them as label. */
export function cleanCinemaCityTitle(raw: string): { title: string; label?: string } {
  let t = clean(raw);
  const labels: string[] = [];
  const suffix = /\s+(PAID PREVIEW|ANTESTREIA|VP|VO|3D)$/i;
  for (let m = t.match(suffix); m; m = t.match(suffix)) {
    const s = m[1]!.toUpperCase();
    if (s === "VP" || s === "3D") labels.unshift(s);
    if (s === "PAID PREVIEW" || s === "ANTESTREIA") labels.unshift("Antestreia");
    t = t.slice(0, m.index).trim();
  }
  // Inverted articles: "PRAGA, A", "CHRISTOPHERS, OS", "GATO DO CHAPEU, O"
  const inv = t.match(/^(.*),\s*(O|A|OS|AS|UM|UMA|THE)$/i);
  if (inv) t = `${inv[2]} ${inv[1]}`;
  return { title: t, label: labels.join(" · ") || undefined };
}

/** Parse one cinema+date timeline (htmlresponse of quick_movie_session_menu/movie). */
export function parseCinemaCityDay(html: string, date: string): RawSession[] {
  const out: RawSession[] = [];
  for (const li of html.matchAll(/<li class="movie">([\s\S]*?)<\/li>/g)) {
    const body = li[1]!;
    const link = body.match(/showwarning\('https?:\/\/([a-z]+)\.admit-one\.eu\/\?p=tickets&(?:amp;)?perfCode=(\d+)'/);
    const time = body.match(/<span class="hour">\s*(\d{1,2}:\d{2})\s*<\/span>/)?.[1];
    if (!link || !time) continue;
    const cinemaId = SUBDOMAIN[link[1]!];
    if (!cinemaId) continue;
    const name = body.replace(/<span class="hour">[\s\S]*?<\/span>/, "").replace(/<span class="badge[\s\S]*?<\/span>/g, "");
    const { title, label } = cleanCinemaCityTitle(name.replace(/^[\s\S]*?>/, ""));
    if (!title) continue;
    const badge = clean(body.match(/<span class="badge[^"]*">([\s\S]*?)<\/span>/)?.[1]);
    // Badges look like "NORMAL + BIG" / "VIP": keep the room-type part.
    const roomType = badge.split("+").map((s) => s.trim()).filter((s) => s && s !== "NORMAL").join(" ") || undefined;
    out.push({
      source: "cinemacity", cinemaId, date, time: time.padStart(5, "0"),
      film: { title },
      room: roomType === "VIP" ? "Sala VIP" : roomType ? `Sala ${roomType}` : undefined,
      label,
      url: `https://${link[1]}.admit-one.eu/?p=tickets&perfCode=${link[2]}`,
      urlKind: "session",
      sourceSessionId: `${link[1]}-${link[2]}`,
    });
  }
  return out;
}

export function parseCinemaCityDates(html: string): string[] {
  return [...html.matchAll(/value="(\d{4}-\d{2}-\d{2})"/g)].map((m) => m[1]!);
}

async function ajax(params: Record<string, string>): Promise<string> {
  const qs = new URLSearchParams({ trigger_pre_event_0: "quick_movie_session_menu", ...params });
  const j = (await (await politeFetch(`${AJAX}?${qs}`)).json()) as { status: boolean; htmlresponse: string };
  if (!j.status) throw new Error(`ajax status false for ${qs}`);
  return j.htmlresponse;
}

export async function scrapeCinemaCity(): Promise<SourceResult> {
  const sessions: RawSession[] = [];
  const warnings: string[] = [];
  for (const c of cinemasForSource("cinemacity")) {
    // has_vip must be empty: "0" now returns a partial list (verified 24 Nov 2026).
    const dates = parseCinemaCityDates(await ajax({ field_id: "date", cinema: c.sourceRef!, has_vip: "" }));
    if (!dates.length) warnings.push(`${c.shortName}: no dates`);
    for (const date of dates) {
      const day = parseCinemaCityDay(await ajax({ field_id: "movie", cinema: c.sourceRef!, date, has_vip: "" }), date);
      sessions.push(...day.filter((s) => s.cinemaId === c.id));
    }
  }
  return { source: "cinemacity", sessions, warnings };
}
