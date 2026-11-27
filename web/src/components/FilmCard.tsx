import type { Film, Session } from "@eden/shared";
import { useT } from "../lib/i18n.ts";
import { Emblem } from "./Art.tsx";
import { Chip, MoreChip } from "./Session.tsx";

const VISIBLE = 5;

/** `hint`: a small "›" telling people the card opens (José: friends didn't know). */
export function FilmFacts({ film, hint = false }: { film: Film; hint?: boolean }) {
  const { lang } = useT();
  return (
    <p className="facts">
      {film.year && <span>{film.year}</span>}
      {film.runtimeMin && <span>{film.runtimeMin} min</span>}
      {film.imdb && <span className="imdb" lang="en">IMDb <b>{film.imdb.toLocaleString(lang === "pt" ? "pt-PT" : "en-GB", { minimumFractionDigits: 1 })}</b></span>}
      {hint && <span className="more-hint" aria-hidden="true">›</span>}
    </p>
  );
}

export function Poster({ film, width = 92, eager = false }: { film: Film; width?: number; eager?: boolean }) {
  return film.posterUrl
    ? <img className="poster" src={film.posterUrl} alt="" width={width} height={Math.round(width * 1.5)} loading={eager ? "eager" : "lazy"} fetchPriority={eager ? "high" : "auto"} decoding="async" />
    : <div className="poster poster-none" style={{ width, height: Math.round(width * 1.5) }}><Emblem size={Math.round(width / 3)} bg="var(--color-balcao)" /></div>;
}

/** Card: poster, title (PT + original), year, runtime, IMDb, next session chips. Tap → film sheet. */
export function FilmCard({ film, sessions, onOpen, eager = false, showCinema = true, badge = showCinema }: {
  film: Film; sessions: Session[]; onOpen: () => void; eager?: boolean; showCinema?: boolean; badge?: boolean;
}) {
  const shown = sessions.length > VISIBLE + 1 ? sessions.slice(0, VISIBLE) : sessions;
  return (
    <article className="film">
      {/* The title button's ::after stretches over poster + text, so the whole head opens the sheet. */}
      <div className="film-head">
        <Poster film={film} eager={eager} />
        <div>
          <h3><button type="button" onClick={onOpen}>{film.title}</button></h3>
          {film.originalTitle && <p className="orig">{film.originalTitle}</p>}
          <FilmFacts film={film} hint />
        </div>
      </div>
      <div className="chips">
        {shown.map((s) => <Chip key={s.id} s={s} badge={badge} showCinema={showCinema} />)}
        {shown.length < sessions.length && <MoreChip n={sessions.length - shown.length} onOpen={onOpen} />}
      </div>
    </article>
  );
}
