import type { Cinema, Programme } from "@eden/shared";
import { useT } from "../lib/i18n.ts";
import { cinemaDay, cinemasOfKind, nextSessionDate } from "../lib/programme.ts";
import { ago, dayOfMonth, weekdayShort } from "../lib/time.ts";

/** Comercial / Autor: the cinemas, each with today's remaining sessions or its data status. */
export function CinemaList({ p, kind, today, now, onPick }: { p: Programme; kind: Cinema["kind"]; today: string; now: number; onPick: (id: string) => void }) {
  const { t, lang } = useT();
  return (
    <ul className="cinema-list">
      {cinemasOfKind(kind).map((c) => {
        const status = p.sources[c.source];
        const left = cinemaDay(p, c.id, today, now).length;
        const next = left ? undefined : nextSessionDate(p, c.id, today, now);
        const note = !status?.ok ? (status?.lastSuccess ? t.updated(ago(status.lastSuccess, lang, now)) : t.noTimes)
          : left ? t.sessions(left)
          : next ? t.nextOn(`${weekdayShort(next, lang)} ${dayOfMonth(next)}`) : t.nothingSoon;
        return (
          <li key={c.id}>
            <button type="button" onClick={() => onPick(c.id)}>
              <span className="cinema-row-name">{c.name}</span>
              <span className={status?.ok ? "cinema-row-note" : "cinema-row-note stale-text"}>{note}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
