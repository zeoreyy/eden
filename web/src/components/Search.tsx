import { useEffect, useRef, useState } from "react";
import { ZONES } from "@eden/shared";
import type { Zone } from "@eden/shared";
import { filtersOf, type Filters, type Route } from "../lib/hooks.ts";
import { useT } from "../lib/i18n.ts";
import { Sheet } from "./Sheet.tsx";

const ITEM = 40; // px per wheel row

/** One scroll-wheel column (iPhone-style): snaps to a row; tap a row or use ↑/↓. */
function WheelColumn({ options, value, onChange, label, wide = false }: { options: string[]; value: number; onChange: (i: number) => void; label: string; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // The sheet's <dialog> opens after this mounts, so wait a frame before scrolling to the current value.
  useEffect(() => { const id = requestAnimationFrame(() => { if (ref.current) ref.current.scrollTop = value * ITEM; }); return () => cancelAnimationFrame(id); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const select = (i: number) => {
    const j = Math.max(0, Math.min(options.length - 1, i));
    onChange(j);
    ref.current!.scrollTo({ top: j * ITEM, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };
  return (
    <div className={wide ? "wheel-col wide" : "wheel-col"} ref={ref} role="listbox" aria-label={label} tabIndex={0}
      aria-activedescendant={`${label}-${value}`}
      onScroll={() => { clearTimeout(timer.current); timer.current = setTimeout(() => {
        const i = Math.round(ref.current!.scrollTop / ITEM);
        if (i !== value && i >= 0 && i < options.length) onChange(i);
      }, 90); }}
      onKeyDown={(e) => { if (e.key === "ArrowDown") { e.preventDefault(); select(value + 1); } if (e.key === "ArrowUp") { e.preventDefault(); select(value - 1); } }}>
      <div className="wheel-pad" />
      {options.map((o, i) => (
        <div key={o + i} id={`${label}-${i}`} role="option" aria-selected={i === value} className={i === value ? "wheel-item on" : "wheel-item"} onClick={() => select(i)}>{o}</div>
      ))}
      <div className="wheel-pad" />
    </div>
  );
}

type Which = "after" | "duration" | "zone";

const HOURS = ["10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "00"];
const QUARTERS = ["00", "15", "30", "45"];
const DUR_H = ["1", "2", "3"];

function WheelSheet({ which, filters, onApply, onClose }: { which: Which; filters: Filters; onApply: (f: Partial<Filters>) => void; onClose: () => void }) {
  const { t, lang } = useT();
  const [a, setA] = useState(() =>
    which === "after" ? HOURS.indexOf((filters.after ?? "19:00").slice(0, 2))
      : which === "duration" ? Math.max(0, DUR_H.indexOf(String(Math.floor((filters.maxMin ?? 120) / 60))))
        : filters.zone ? ZONES.findIndex((z) => z.id === filters.zone) + 1 : 1);
  const [b, setB] = useState(() =>
    which === "after" ? Math.max(0, QUARTERS.indexOf((filters.after ?? "19:00").slice(3, 5)))
      : which === "duration" ? Math.max(0, QUARTERS.indexOf(String((filters.maxMin ?? 120) % 60).padStart(2, "0"))) : 0);
  const title = which === "after" ? t.afterTitle : which === "duration" ? t.durationTitle : t.zoneTitle;
  const apply = () => {
    if (which === "after") onApply({ after: `${HOURS[a]}:${QUARTERS[b]}` });
    else if (which === "duration") onApply({ maxMin: Number(DUR_H[a]) * 60 + Number(QUARTERS[b]) });
    else onApply({ zone: a === 0 ? undefined : ZONES[a - 1]!.id });
  };
  const clear = () => onApply(which === "after" ? { after: undefined } : which === "duration" ? { maxMin: undefined } : { zone: undefined });
  return (
    <Sheet label={title} onClose={onClose} className="wheel-sheet">
      <h2 className="wheel-title">{title}</h2>
      <div className="wheel">
        <div className="wheel-band" aria-hidden="true" />
        {which === "after" && <>
          <WheelColumn label={lang === "pt" ? "horas" : "hours"} options={HOURS} value={a} onChange={setA} />
          <span className="wheel-sep" aria-hidden="true">:</span>
          <WheelColumn label={lang === "pt" ? "minutos" : "minutes"} options={QUARTERS} value={b} onChange={setB} />
        </>}
        {which === "duration" && <>
          <WheelColumn label={lang === "pt" ? "horas" : "hours"} options={DUR_H.map((h) => `${h}h`)} value={a} onChange={setA} />
          <WheelColumn label={lang === "pt" ? "minutos" : "minutes"} options={QUARTERS} value={b} onChange={setB} />
        </>}
        {which === "zone" && (
          <WheelColumn label={t.zone} options={[t.allZones, ...ZONES.map((z) => z[lang])]} value={a} onChange={setA} wide />
        )}
      </div>
      <div className="wheel-actions">
        <button type="button" className="btn-quiet" onClick={clear}>{t.clear}</button>
        <button type="button" className="btn-solid" onClick={apply}>{t.apply}</button>
      </div>
    </Sheet>
  );
}

/**
 * Search + filters (José): a clean field, then three quiet pills set with a scroll wheel —
 * start time ("Depois das 19:30"), length ("Até 2h 00") and area. They live in the URL, so they follow you
 * across days and tabs and survive a shared link. `zone={false}` on a single cinema's page.
 */
export function SearchBar({ route, go, zone = true, only }: { route: Route; go: (r: Route, o?: { replace?: boolean }) => void; zone?: boolean; only?: "zone" }) {
  const { t, lang } = useT();
  const [open, setOpen] = useState<Which | null>(null);
  const f = filtersOf(route);
  const set = (patch: Partial<Filters>) => go({ ...route, ...patch }, { replace: true });
  const zoneName = (z?: Zone) => ZONES.find((x) => x.id === z)?.[lang];
  const pill = (which: Which, name: string, value?: string) => (
    <span className={value ? "fpill on" : "fpill"}>
      <button type="button" className="fpill-main" onClick={() => setOpen(which)}>{value ?? name}</button>
      {value && <button type="button" className="fpill-x" aria-label={t.removeFilter(name)}
        onClick={() => set(which === "after" ? { after: undefined } : which === "duration" ? { maxMin: undefined } : { zone: undefined })}>×</button>}
    </span>
  );
  if (only === "zone") {
    // Cinemas list: just the area pill.
    return (
      <div className="search">
        <div className="fpills">{pill("zone", t.zone, zoneName(f.zone))}</div>
        {open && <WheelSheet which={open} filters={f} onClose={() => setOpen(null)} onApply={(patch) => { set(patch); setOpen(null); }} />}
      </div>
    );
  }
  return (
    <div className="search" data-tour="search">
      <label className="search-field">
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
        <input type="search" value={route.q ?? ""} placeholder={t.search} aria-label={t.search} enterKeyHint="search" autoComplete="off" spellCheck={false}
          onChange={(e) => set({ q: e.target.value || undefined })} />
        {route.q && <button type="button" className="search-x" aria-label={t.clearSearch} onClick={() => set({ q: undefined })}>×</button>}
      </label>
      <div className="fpills">
        {pill("after", t.after, f.after ? t.afterValue(f.after) : undefined)}
        {pill("duration", t.duration, f.maxMin ? t.durationValue(Math.floor(f.maxMin / 60), f.maxMin % 60) : undefined)}
        {zone && pill("zone", t.zone, zoneName(f.zone))}
      </div>
      {open && <WheelSheet which={open} filters={f} onClose={() => setOpen(null)} onApply={(patch) => { set(patch); setOpen(null); }} />}
    </div>
  );
}
