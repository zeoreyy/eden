/**
 * Top picks per day (spec): commercial films only, ordering only — nothing is hidden.
 * Eligible = showing in ≥ 3 distinct commercial cinemas between 18:00 and 23:00 that evening.
 * Order: NOS's own featured list first (in its order), then the rest by number of cinemas. Max 6.
 */
import type { Session } from "@eden/shared";
import { CINEMA_BY_ID } from "@eden/shared";

export const EVENING_FROM = "18:00";
export const EVENING_TO = "23:00";

export function topPicks(sessions: Session[], featured: string[], max = 6, minCinemas = 3): Record<string, string[]> {
  const byDay = new Map<string, Map<string, Set<string>>>();
  for (const s of sessions) {
    if (CINEMA_BY_ID.get(s.cinemaId)?.kind !== "commercial") continue;
    const t = s.startsAt.slice(11, 16); // startsAt carries the Lisbon offset, so this is Lisbon wall-clock
    if (s.startsAt.slice(0, 10) !== s.programmeDate || t < EVENING_FROM || t > EVENING_TO) continue;
    const day = byDay.get(s.programmeDate) ?? new Map<string, Set<string>>();
    byDay.set(s.programmeDate, day);
    const set = day.get(s.filmKey) ?? new Set<string>();
    set.add(s.cinemaId);
    day.set(s.filmKey, set);
  }
  const out: Record<string, string[]> = {};
  for (const [date, films] of [...byDay].sort()) {
    const count = (k: string) => films.get(k)?.size ?? 0;
    const eligible = [...films.keys()].filter((k) => count(k) >= minCinemas);
    if (!eligible.length) continue;
    const fromList = [...new Set(featured)].filter((k) => eligible.includes(k));
    const rest = eligible.filter((k) => !fromList.includes(k)).sort((a, b) => count(b) - count(a) || a.localeCompare(b));
    out[date] = [...fromList, ...rest].slice(0, max);
  }
  return out;
}
