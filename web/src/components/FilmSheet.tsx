import { useEffect, useRef } from "react";
import type { Film, Programme } from "@eden/shared";
import { useT } from "../lib/i18n.ts";
import { filmSchedule } from "../lib/programme.ts";
import { longDate } from "../lib/time.ts";
import { FilmFacts, Poster } from "./FilmCard.tsx";
import { Chip } from "./Session.tsx";

/** Film sheet (arched top): every coming session, grouped day → cinema → time chips. */
export function FilmSheet({ p, film, today, now, onClose }: { p: Programme; film: Film; today: string; now: number; onClose: () => void }) {
  const { t, lang } = useT();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current!;
    if (!d.open) d.showModal();
    document.documentElement.classList.add("sheet-open");
    return () => document.documentElement.classList.remove("sheet-open");
  }, []);
  const days = filmSchedule(p, film.key, today, now);
  return (
    <dialog ref={ref} className="sheet" aria-labelledby="sheet-title" onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}>
      <div className="sheet-body">
        <button type="button" className="sheet-close" onClick={onClose} aria-label={t.close}><span aria-hidden="true" /></button>
        <header className="sheet-head">
          <Poster film={film} width={84} />
          <div>
            <h2 id="sheet-title">{film.title}</h2>
            {film.originalTitle && <p className="orig">{film.originalTitle}</p>}
            <FilmFacts film={film} />
          </div>
        </header>
        {days.map(({ date, cinemas }) => (
          <section key={date} className="sheet-day">
            <h3>{date === today ? `${t.today} · ${longDate(date, lang)}` : longDate(date, lang)}</h3>
            {cinemas.map(({ cinema, sessions }) => (
              <div key={cinema.id} className="sheet-cinema">
                <p className="cinema-name">{cinema.shortName}</p>
                <div className="chips">{sessions.map((s) => <Chip key={s.id} s={s} showCinema={false} />)}</div>
              </div>
            ))}
          </section>
        ))}
        {film.letterboxdUrl && <a className="lb" href={film.letterboxdUrl} target="_blank" rel="noopener noreferrer">{t.letterboxd}</a>}
      </div>
    </dialog>
  );
}
