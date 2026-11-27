import { CINEMA_BY_ID } from "@eden/shared";
import type { Session } from "@eden/shared";
import { useT } from "../lib/i18n.ts";
import { hhmm } from "../lib/time.ts";
import { isArthouse } from "../lib/programme.ts";

/** iOS-style share glyph, drawn here (no icon font). */
export function ShareGlyph({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={Math.round(size * 1.2)} viewBox="0 0 14 17" aria-hidden="true">
      <path d="M7 1v10M3.5 4.5 7 1l3.5 3.5M4 7H1.5v9h11V7H10" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Session chip: time · cinema · room/label. Opens the official URL (session > film > venue).
 * In the film sheet it also gets a small share button, and the session someone shared with you is lit.
 */
export function Chip({ s, showCinema = true, badge = false, lit = false, onShare }: {
  s: Session; showCinema?: boolean; badge?: boolean; lit?: boolean; onShare?: () => void;
}) {
  const { t } = useT();
  const cinema = CINEMA_BY_ID.get(s.cinemaId);
  const detail = [s.room, s.label].filter(Boolean).join(" · ");
  const autor = badge && isArthouse(s);
  const chip = (
    <a className={lit ? "chip lit" : "chip"} href={s.url} target="_blank" rel="noopener noreferrer" data-session={s.id}>
      <time dateTime={s.startsAt}>{hhmm(s.startsAt)}</time>
      {showCinema && <span className="where">{cinema?.shortName}</span>}
      <span className="what">{autor && <span className="badge">{t.badge}</span>}{detail || " "}</span>
    </a>
  );
  if (!onShare) return chip;
  return (
    <div className="chip-wrap">
      {chip}
      <button type="button" className="chip-share" onClick={onShare} aria-label={`${t.shareSession} ${hhmm(s.startsAt)}`}><ShareGlyph size={12} /></button>
    </div>
  );
}

/** "+ N sessões" — opens the film sheet. */
export function MoreChip({ n, onOpen }: { n: number; onOpen: () => void }) {
  const { t } = useT();
  return <button type="button" className="chip more" onClick={onOpen}>{t.more(n)}</button>;
}
