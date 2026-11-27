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

// ── Sharing eden itself (info sheet): message + the eden video ──────────────────────────────────────
/** The public address (also from a preview build, people should get the real one). */
export const APP_URL = "https://eden.zeorey.workers.dev";
const VIDEO_URL = "/share/eden.mp4"; // 720p, ~5 MB (made from José's 40 s film with ffmpeg)

let video: File | null = null;
let loading: Promise<void> | null = null;

/** Start fetching the video early (when the info sheet opens): iOS only allows share() right after the tap. */
export function prepareShareVideo(): void {
  if (loading || typeof navigator === "undefined" || !navigator.canShare) return;
  const probe = new File([""], "eden.mp4", { type: "video/mp4" });
  if (!navigator.canShare({ files: [probe] })) return; // desktop browsers: message only
  loading = fetch(VIDEO_URL)
    .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
    .then((b) => { video = new File([b], "eden.mp4", { type: "video/mp4" }); })
    .catch(() => { loading = null; });
}

/**
 * "eden | Lisboa em cartaz — …" with the link on its own last line (WhatsApp keeps it tappable, and many
 * apps drop the separate url field when a file is attached). Video attached when it's ready.
 */
export async function shareApp(t: Strings): Promise<void> {
  const text = `${t.shareAppText}\n${APP_URL}`;
  if (navigator.share) {
    try {
      if (video && navigator.canShare?.({ files: [video] })) await navigator.share({ title: "eden", text, files: [video] });
      else await navigator.share({ title: "eden", text });
      return;
    } catch (e) { if ((e as Error).name === "AbortError") return; }
  }
  try { await navigator.clipboard.writeText(text); toast(t.copied); } catch { /* nothing we can do */ }
}
