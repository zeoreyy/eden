/** Small shared helpers for parsers. */

export function lisbonToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function pad2(n: number | string): string {
  return String(n).padStart(2, "0");
}

/** "21h30", "21:30", "9h" → "21:30" / "09:00"; null if not a time. */
export function parseTime(s: string): string | null {
  const m = s.trim().match(/^(\d{1,2})\s*[hH:.]\s*(\d{2})?$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2] ?? 0);
  if (h > 29 || min > 59) return null;
  return `${pad2(h)}:${pad2(min)}`;
}

const PT_MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** "nov", "novembro", "Novembro" → 1-12; null if unknown. */
export function ptMonth(s: string): number | null {
  const k = stripAccents(s.trim().toLowerCase()).slice(0, 3);
  const i = PT_MONTHS.indexOf(k);
  return i < 0 ? null : i + 1;
}

export function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "");
}

/** Day+month without a year → the nearest such date, allowing up to `pastDays` in the past. */
export function inferYear(day: number, month: number, today: string, pastDays = 31): string {
  const y = Number(today.slice(0, 4));
  const lo = addDays(today, -pastDays);
  for (const year of [y, y + 1]) {
    const cand = `${year}-${pad2(month)}-${pad2(day)}`;
    if (cand >= lo) return cand;
  }
  return `${y + 1}-${pad2(month)}-${pad2(day)}`;
}

const ENTITIES: Record<string, string> = {
  nbsp: " ", amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", ndash: "–", mdash: "—",
  rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”", hellip: "…", laquo: "«", raquo: "»",
  ccedil: "ç", atilde: "ã", otilde: "õ", aacute: "á", eacute: "é", iacute: "í", oacute: "ó", uacute: "ú",
  agrave: "à", acirc: "â", ecirc: "ê", ocirc: "ô", Aacute: "Á", Eacute: "É", Ccedil: "Ç", Atilde: "Ã",
};

export function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-zA-Z]+);/g, (m, n: string) => ENTITIES[n] ?? m);
}

/** Strip tags, decode entities, collapse whitespace. */
export function text(html: string | undefined | null): string {
  return decodeEntities((html ?? "").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " "))
    .replace(/[ \t ]+/g, " ").replace(/\s*\n\s*/g, "\n").trim();
}

/** Visible text of a page as trimmed non-empty lines (block tags and <br> become newlines). */
export function htmlLines(html: string): string[] {
  const body = html
    .replace(/<head[\s\S]*?<\/head>/i, "")
    .replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(div|p|h\d|li|tr|section|article|header)>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  return decodeEntities(body).split("\n").map((s) => s.replace(/[\s ]+/g, " ").trim()).filter(Boolean);
}

/** Lowercase ASCII letters+digits only — for fuzzy title/slug comparison. */
export function squash(s: string): string {
  return stripAccents(s).toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0]!;
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j]!;
      dp[j] = Math.min(dp[j]! + 1, dp[j - 1]! + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length]!;
}

export function clean(s: string | undefined | null): string {
  return text(s).replace(/\s+/g, " ").trim();
}
