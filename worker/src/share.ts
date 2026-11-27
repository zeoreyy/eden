// Share links (José's growth loop): /s/<session id> → a tiny page whose Open Graph tags make WhatsApp show
// the poster + "The Hunger Games · sex 27 · 21:30", then it sends the visitor to the app with that session lit.
import { CINEMA_BY_ID } from "@eden/shared";
import type { Film, Session } from "@eden/shared";

/**
 * Pull one flat JSON object out of the published programme text without parsing ~1 MB
 * (free Workers get 10 ms of CPU). Sessions and films are flat objects, so the object ends at a "}".
 */
export function extractObject<T>(text: string, marker: string): T | undefined {
  const start = text.indexOf(marker);
  if (start < 0) return undefined;
  let end = text.indexOf("}", start);
  for (let tries = 0; end > 0 && tries < 8; tries++) {
    try { return JSON.parse(text.slice(start, end + 1)) as T; } catch { end = text.indexOf("}", end + 1); }
  }
  return undefined;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** "sex 27 nov · 21:30" (pt-PT, Lisbon wall-clock from the session's own offset). */
const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export function whenLabel(s: Session): string {
  const d = new Date(`${s.programmeDate}T12:00:00Z`);
  // pt-PT "short" weekday is the full word ("sexta"), so take three letters, like the app's day selector.
  const wd = new Intl.DateTimeFormat("pt-PT", { weekday: "short", timeZone: "UTC" }).format(d).replace(".", "").slice(0, 3);
  return `${wd} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} · ${s.startsAt.slice(11, 16)}`;
}

export function sharePage(programmeText: string, id: string, origin: string): string | undefined {
  if (!/^[0-9a-f]{6,40}$/.test(id)) return undefined;
  const s = extractObject<Session>(programmeText, `{"id":"${id}"`);
  if (!s) return undefined;
  const film = extractObject<Film>(programmeText, `{"key":"${s.filmKey}"`);
  if (!film) return undefined;
  const cinema = CINEMA_BY_ID.get(s.cinemaId);
  const title = `${film.title} · ${whenLabel(s)}`;
  const desc = [cinema?.name, s.room].filter(Boolean).join(" · ") + " — eden";
  const target = `${origin}/?${new URLSearchParams({ filme: film.key, dia: s.programmeDate, sessao: s.id })}`;
  const image = film.posterUrl?.startsWith("https://") ? film.posterUrl : `${origin}/og.png`;
  return `<!doctype html><html lang="pt"><head><meta charset="utf-8">
<title>${esc(title)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta property="og:type" content="website"><meta property="og:site_name" content="eden">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(image)}"><meta property="og:url" content="${esc(`${origin}/s/${id}`)}">
<meta name="twitter:card" content="summary">
<meta http-equiv="refresh" content="0;url=${esc(target)}">
<style>body{background:#1a1613;color:#ece1cf;font:16px system-ui;display:grid;place-items:center;min-height:100vh;margin:0}a{color:#d6a892}</style>
</head><body><a href="${esc(target)}">${esc(title)}</a><script>location.replace(${JSON.stringify(target)})</script></body></html>`;
}
