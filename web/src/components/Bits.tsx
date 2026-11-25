import type { Programme } from "@eden/shared";
import type { Cinema } from "@eden/shared";
import { useT } from "../lib/i18n.ts";
import { staleCinemas } from "../lib/programme.ts";
import { ago, dayOfMonth, weekdayShort } from "../lib/time.ts";

/** Light-ribbon divider (the ceiling strips). */
export function Ribbon() {
  return <div className="ribbon" aria-hidden="true"><i /><i /><i /></div>;
}

/** Day selector drawn as a balcony front: boxes separated by partitions. */
export function DaySelector({ days, today, value, onChange }: { days: string[]; today: string; value: string; onChange: (d: string) => void }) {
  const { t, lang } = useT();
  return (
    <div className="days" role="group" aria-label={t.days}>
      {days.map((d) => (
        <button key={d} type="button" aria-pressed={d === value} onClick={() => onChange(d)}>
          <b>{d === today ? t.today : dayOfMonth(d)}</b>
          {weekdayShort(d, lang)}
        </button>
      ))}
    </div>
  );
}

/** "Never hide a cinema silently": every cinema whose source isn't fresh, with how old its data is. */
export function StaleNotes({ p, kind, now }: { p: Programme; kind?: Cinema["kind"]; now: number }) {
  const { t, lang } = useT();
  const stale = staleCinemas(p, kind);
  if (!stale.length) return null;
  return (
    <div className="stale-list">
      {stale.map(({ cinema, status }) => (
        <p className="stale" key={cinema.id}>
          <strong>{cinema.name}</strong>
          <span>{status?.lastSuccess ? t.updated(ago(status.lastSuccess, lang, now)) : t.noTimes}</span>
          <a href={cinema.url} target="_blank" rel="noopener noreferrer">{t.seeSite}</a>
        </p>
      ))}
    </div>
  );
}

export function PageTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="page-title">
      <h1>{title}</h1>
      {sub && <p>{sub}</p>}
    </div>
  );
}
