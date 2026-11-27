import { useEffect } from "react";
import type { Film, Programme } from "@eden/shared";
import { useT } from "../lib/i18n.ts";
import { filmSchedule } from "../lib/programme.ts";
import { shareSession } from "../lib/share.ts";
import { longDate } from "../lib/time.ts";
import { FilmFacts, Poster } from "./FilmCard.tsx";
import { Chip } from "./Session.tsx";
import { Sheet } from "./Sheet.tsx";

/**
 * Where to read about the film (José: director, cast, synopsis, trailer live elsewhere — just link there).
 * IMDb / TMDB / Letterboxd come from the TMDB match; the cinema page was scraped. Nothing is guessed.
 */
function FilmLinks({ film }: { film: Film }) {
  const { t } = useT();
  const links = [
    film.imdbId && { href: `https://www.imdb.com/title/${film.imdbId}/`, label: "IMDb" },
    film.letterboxdUrl && { href: film.letterboxdUrl, label: "Letterboxd" },
    film.tmdbId && { href: `https://www.themoviedb.org/movie/${film.tmdbId}`, label: "TMDB" },
    film.pageUrl && { href: film.pageUrl, label: t.cinemaPage },
  ].filter((l): l is { href: string; label: string } => !!l);
  if (!links.length) return null;
  return (
    <nav className="film-links" aria-label={t.moreAbout}>
      {links.map((l) => <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer">{l.label}</a>)}
    </nav>
  );
}

/** Film sheet: every coming session, grouped day → cinema → time chips, each shareable. */
export function FilmSheet({ p, film, today, now, litSession, onClose }: {
  p: Programme; film: Film; today: string; now: number; litSession?: string; onClose: () => void;
}) {
  const { t, lang } = useT();
  const days = filmSchedule(p, film.key, today, now);
  // A shared link (…?sessao=) opens the sheet on that session.
  useEffect(() => {
    if (!litSession) return;
    const id = setTimeout(() => document.querySelector(`.sheet [data-session="${CSS.escape(litSession)}"]`)?.scrollIntoView({ block: "center" }), 250);
    return () => clearTimeout(id);
  }, [litSession]);
  return (
    <Sheet label={film.title} onClose={onClose}>
      <header className="sheet-head">
        <Poster film={film} width={84} />
        <div>
          <h2>{film.title}</h2>
          {film.originalTitle && <p className="orig">{film.originalTitle}</p>}
          <FilmFacts film={film} />
        </div>
      </header>
      <FilmLinks film={film} />
      {days.map(({ date, cinemas }) => (
        <section key={date} className="sheet-day">
          <h3>{date === today ? `${t.today} · ${longDate(date, lang)}` : longDate(date, lang)}</h3>
          {cinemas.map(({ cinema, sessions }) => (
            <div key={cinema.id} className="sheet-cinema">
              <p className="cinema-name">{cinema.shortName}</p>
              <div className="chips">
                {sessions.map((s) => (
                  <Chip key={s.id} s={s} showCinema={false} lit={s.id === litSession}
                    onShare={() => void shareSession(film, s, today, lang, t)} />
                ))}
              </div>
            </div>
          ))}
        </section>
      ))}
    </Sheet>
  );
}
