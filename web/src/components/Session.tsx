import { CINEMA_BY_ID } from "@eden/shared";
import type { Session } from "@eden/shared";
import { useT } from "../lib/i18n.ts";
import { hhmm } from "../lib/time.ts";
import { isArthouse } from "../lib/programme.ts";

/** Session chip: time · cinema · room/label. Opens the official URL (session > film > venue). */
export function Chip({ s, showCinema = true, badge = false }: { s: Session; showCinema?: boolean; badge?: boolean }) {
  const { t } = useT();
  const cinema = CINEMA_BY_ID.get(s.cinemaId);
  const detail = [s.room, s.label].filter(Boolean).join(" · ");
  const autor = badge && isArthouse(s);
  return (
    <a className="chip" href={s.url} target="_blank" rel="noopener noreferrer">
      <time dateTime={s.startsAt}>{hhmm(s.startsAt)}</time>
      {showCinema && <span className="where">{cinema?.shortName}</span>}
      <span className="what">{autor && <span className="badge">{t.badge}</span>}{detail || " "}</span>
    </a>
  );
}

/** "+ N sessões" — opens the film sheet. */
export function MoreChip({ n, onOpen }: { n: number; onOpen: () => void }) {
  const { t } = useT();
  return <button type="button" className="chip more" onClick={onOpen}>{t.more(n)}</button>;
}
