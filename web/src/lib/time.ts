/** Lisbon wall-clock helpers. Sessions carry their Lisbon offset in `startsAt`, so the time is chars 11–16. */
import type { Lang } from "./i18n.ts";

const DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon", year: "numeric", month: "2-digit", day: "2-digit" });

export function lisbonDate(d = new Date()): string {
  return DAY.format(d);
}

export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export const hhmm = (startsAt: string) => startsAt.slice(11, 16);

const locale = (lang: Lang) => (lang === "pt" ? "pt-PT" : "en-GB");
const noon = (date: string) => new Date(`${date}T12:00:00Z`);

/** "qua" / "Wed" */
export function weekdayShort(date: string, lang: Lang): string {
  const s = new Intl.DateTimeFormat(locale(lang), { weekday: "short", timeZone: "UTC" }).format(noon(date)).replace(".", "");
  return lang === "pt" ? s.slice(0, 3) : s; // pt-PT "short" is the full word ("quarta")
}

/** "quarta, 25 de novembro" / "Wednesday 25 November" */
export function longDate(date: string, lang: Lang): string {
  const s = new Intl.DateTimeFormat(locale(lang), { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(noon(date));
  return lang === "pt" ? s.replace("-feira", "") : s.replace(",", "");
}

export function dayOfMonth(date: string): number {
  return Number(date.slice(8, 10));
}

/** "2 h" / "3 dias" / "2 days" — how long ago an ISO instant was. */
export function ago(iso: string, lang: Lang, now = Date.now()): string {
  const min = Math.max(0, Math.round((now - Date.parse(iso)) / 60_000));
  const rtf = new Intl.RelativeTimeFormat(locale(lang), { numeric: "always", style: "long" });
  const [v, u]: [number, Intl.RelativeTimeFormatUnit] = min < 60 ? [min, "minute"] : min < 48 * 60 ? [Math.round(min / 60), "hour"] : [Math.round(min / 1440), "day"];
  return rtf.format(-v, u);
}
