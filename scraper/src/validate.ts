/** Per-source sanity checks. A failing source keeps its last good data (never hidden). */
import { cinemasForSource } from "@eden/shared";
import type { SourceResult, RawSession } from "./types.ts";
import { addDays } from "./util.ts";

export interface Validation {
  ok: boolean;
  sessions: RawSession[];
  /** Why it failed, or what looked odd. */
  note?: string;
}

function validSession(s: RawSession, cinemaIds: Set<string>, today: string): boolean {
  if (!cinemaIds.has(s.cinemaId) || !s.film.title.trim()) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s.date) || !/^\d{2}:\d{2}$/.test(s.time)) return false;
  if (s.date < addDays(today, -1)) return false;
  try {
    return new URL(s.url).protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Fails when: no sessions, > 20% malformed, or fewer than a quarter of what the last good run had for
 * the same days (a broken parser usually yields a handful). Missing cinemas are noted, not failed.
 * Sessions on past days are dropped.
 */
export function validateSource(r: SourceResult, today: string, previousCount = 0): Validation {
  const cinemaIds = new Set(cinemasForSource(r.source).map((c) => c.id));
  const fresh = r.sessions.filter((s) => (s.programmeDate ?? s.date) >= today || s.date >= today);
  const valid = fresh.filter((s) => validSession(s, cinemaIds, today));
  const bad = fresh.length - valid.length;
  if (!valid.length) return { ok: false, sessions: [], note: "no sessions found" };
  if (bad > fresh.length * 0.2) return { ok: false, sessions: [], note: `${bad} of ${fresh.length} sessions malformed` };
  if (previousCount >= 20 && valid.length < previousCount / 4) {
    return { ok: false, sessions: [], note: `only ${valid.length} sessions (last good run: ${previousCount})` };
  }
  const seen = new Set(valid.map((s) => s.cinemaId));
  const missing = [...cinemaIds].filter((id) => !seen.has(id));
  const notes = [bad ? `${bad} malformed sessions dropped` : "", missing.length ? `no sessions for ${missing.join(", ")}` : ""];
  return { ok: true, sessions: valid, note: notes.filter(Boolean).join("; ") || undefined };
}
