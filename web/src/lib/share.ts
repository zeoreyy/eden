/** Sharing: a session (José's growth loop) or the app. Native share sheet when there is one, else copy the link. */
import { CINEMA_BY_ID } from "@eden/shared";
import type { Film, Session } from "@eden/shared";
import type { Lang, Strings } from "./i18n.ts";
import { addDays, dayOfMonth, hhmm, weekdayShort } from "./time.ts";

const listeners = new Set<(msg: string) => void>();
/** Tiny toast bus (one message at a time, rendered by <Toaster/>). */
export const toast = (msg: string) => listeners.forEach((f) => f(msg));
export const onToast = (f: (msg: string) => void) => { listeners.add(f); return () => { listeners.delete(f); }; };

export async function shareOrCopy(text: string, url: string, copied: string): Promise<void> {
  if (navigator.share) {
    try { await navigator.share({ text, url }); return; }
    catch (e) { if ((e as Error).name === "AbortError") return; /* else fall through to copy */ }
  }
  try { await navigator.clipboard.writeText(`${text} ${url}`); toast(copied); } catch { /* nothing we can do */ }
}

/** "hoje 21:30" / "amanhã 21:30" / "sáb 28, 21:30" */
export function whenText(s: Session, today: string, lang: Lang, t: Strings): string {
  const time = hhmm(s.startsAt);
  if (s.programmeDate === today) return `${t.todayWord} ${time}`;
  if (s.programmeDate === addDays(today, 1)) return `${t.tomorrowWord} ${time}`;
  return `${weekdayShort(s.programmeDate, lang)} ${dayOfMonth(s.programmeDate)}, ${time}`;
}

/** "The Hunger Games · hoje 21:30 · Odivelas?" + https://…/s/<session id> (the Worker turns it into a poster preview). */
export function shareSession(film: Film, s: Session, today: string, lang: Lang, t: Strings): Promise<void> {
  const cinema = CINEMA_BY_ID.get(s.cinemaId)?.shortName ?? "";
  return shareOrCopy(t.shareText(film.title, whenText(s, today, lang, t), cinema), `${location.origin}/s/${s.id}`, t.copied);
}
