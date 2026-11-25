import { CINEMA_BY_ID } from "@eden/shared";
import type { Cinema, Film, Programme } from "@eden/shared";
import { useT } from "../lib/i18n.ts";
import { cinemaDay, cinemasOfKind } from "../lib/programme.ts";
import { ago, hhmm } from "../lib/time.ts";

/** Comercial / Autor: the cinemas, each with today's remaining sessions or its data status. */
export function CinemaList({ p, kind, today, now, onPick }: { p: Programme; kind: Cinema["kind"]; today: string; now: number; onPick: (id: string) => void }) {
  const { t, lang } = useT();
  return (
    <ul className="cinema-list">
      {cinemasOfKind(kind).map((c) => {
        const status = p.sources[c.source];
        const left = cinemaDay(p, c.id, today, now).length;
        const note = !status?.ok ? (status?.lastSuccess ? t.updated(ago(status.lastSuccess, lang, now)) : t.noTimes) : t.sessions(left);
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

/** One cinema's day, chronological: time · film · room/label. Time links to the session; film opens the sheet. */
export function CinemaTimeline({ p, films, cinemaId, date, now, onFilm }: {
  p: Programme; films: Map<string, Film>; cinemaId: string; date: string; now?: number; onFilm: (key: string) => void;
}) {
  const { t } = useT();
  const sessions = cinemaDay(p, cinemaId, date, now);
  const cinema = CINEMA_BY_ID.get(cinemaId);
  if (!sessions.length) return <p className="empty">{now != null ? t.noMoreToday : t.noneThatDay}</p>;
  return (
    <ol className="timeline" aria-label={cinema ? t.sessionsAt(cinema.name) : undefined}>
      {sessions.map((s) => {
        const film = films.get(s.filmKey);
        return (
          <li key={s.id}>
            <a className="tl-time" href={s.url} target="_blank" rel="noopener noreferrer"><time dateTime={s.startsAt}>{hhmm(s.startsAt)}</time></a>
            <button type="button" className="tl-film" onClick={() => onFilm(s.filmKey)}>
              <span className="tl-title">{film?.title}</span>
              <span className="tl-meta">{[s.room, s.label].filter(Boolean).join(" · ")}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
