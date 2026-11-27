import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useT } from "../lib/i18n.ts";
import { installEvent, isStandalone, onInstallEvent, platform, promptInstall } from "../lib/device.ts";
import { Emblem } from "./Art.tsx";
import { ShareGlyph } from "./Session.tsx";

export const TOUR_KEY = "eden.tour.v1";
export const tourSeen = () => { try { return localStorage.getItem(TOUR_KEY) === "1"; } catch { return true; } };
const markSeen = () => { try { localStorage.setItem(TOUR_KEY, "1"); } catch { /* storage blocked */ } };

/** The add-to-home steps for this exact phone/browser (José: iPhones differ — Safari 26 hides Share under ⋯). */
export function InstallSteps() {
  const { t } = useT();
  const [, force] = useState(0);
  useEffect(() => onInstallEvent(() => force((n) => n + 1)), []);
  const plat = platform();
  if (installEvent()) {
    return <button type="button" className="btn-solid" onClick={() => void promptInstall()}>{t.installApp}</button>;
  }
  const steps = t.installSteps[plat] ?? [];
  return (
    <ol className="install-steps">
      {steps.map((s, i) => (
        <li key={i}><span className="step-n">{i + 1}</span><span>{withGlyph(s)}</span></li>
      ))}
    </ol>
  );
}

/** "Toque em Partilhar" → the share glyph stays glued to the word. */
function withGlyph(s: string) {
  const m = s.match(/^(.*?)(Partilhar|Share)(.*)$/);
  if (!m) return s;
  return <>{m[1]}<span className="nowrap">{m[2]} <ShareGlyph size={12} /></span>{m[3]}</>;
}

interface Step { sel?: string; title?: string; text: string; install?: boolean }

/**
 * Guided tour on the real app (José: light up the right place, not separate screens).
 * Shown once per device after the splash; "Como funciona" in the info sheet replays it.
 */
export function Tour({ onDone }: { onDone: () => void }) {
  const { t } = useT();
  const canInstall = !isStandalone() && platform() !== "desktop";
  const steps: Step[] = [
    { title: t.tourWelcomeTitle, text: t.tourWelcome },
    { sel: '[data-tour="days"]', text: t.tourDays },
    { sel: '[data-tour="search"]', text: t.tourSearch },
    { sel: ".list .film-head", text: t.tourFilm },
    { sel: ".list .chips .chip", text: t.tourChip },
    { sel: ".tabs", text: t.tourTabs },
    { sel: '[data-tour="info"]', text: t.tourInfo },
    ...(canInstall ? [{ title: t.installTitleTour, text: "", install: true }] : []),
  ];
  const [i, setI] = useState(0);
  const card = useRef<HTMLDivElement>(null);
  useEffect(() => { card.current?.focus({ preventScroll: true }); }, [i]);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const step = steps[i]!;
  const last = i === steps.length - 1;
  const finish = useCallback(() => { markSeen(); onDone(); }, [onDone]);

  const measure = useCallback(() => {
    const el = step.sel ? document.querySelector(step.sel) : null;
    setRect(el ? el.getBoundingClientRect() : null);
  }, [step.sel]);

  useLayoutEffect(() => {
    const el = step.sel ? document.querySelector(step.sel) : null;
    if (el && !el.closest(".tabs, .top")) el.scrollIntoView({ block: "center", behavior: "auto" });
    measure();
    const id = setTimeout(measure, 120);
    addEventListener("resize", measure);
    addEventListener("scroll", measure, { passive: true });
    return () => { clearTimeout(id); removeEventListener("resize", measure); removeEventListener("scroll", measure); };
  }, [step.sel, measure]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") finish(); };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [finish]);

  const pad = 6;
  const hole = rect && { x: rect.left - pad, y: rect.top - pad, w: rect.width + pad * 2, h: rect.height + pad * 2 };
  const below = hole ? hole.y + hole.h + 190 < innerHeight : false;
  const cardStyle = !hole ? undefined : below ? { top: hole.y + hole.h + 12 } : { bottom: innerHeight - hole.y + 12 };

  return (
    <div className="tour" role="dialog" aria-modal="true" aria-label={t.howItWorks}>
      <svg className="tour-shade" width="100%" height="100%" aria-hidden="true">
        <defs>
          <mask id="tour-mask">
            <rect width="100%" height="100%" fill="#fff" />
            {hole && <rect x={hole.x} y={hole.y} width={hole.w} height={hole.h} rx="12" fill="#000" />}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgb(8 7 6 / .78)" mask="url(#tour-mask)" />
        {hole && <rect className="tour-ring" x={hole.x} y={hole.y} width={hole.w} height={hole.h} rx="12" />}
      </svg>
      <div ref={card} tabIndex={-1} className={hole ? "tour-card" : "tour-card centred"} style={cardStyle}>
        {!hole && <Emblem size={34} bg="var(--color-balcao)" />}
        {step.title && <p className="tour-title">{step.title}</p>}
        {step.text && <p className="tour-text">{step.text}</p>}
        {step.install && <InstallSteps />}
        <div className="tour-foot">
          <span className="tour-dots"><span className="sr-only">{t.stepOf(i + 1, steps.length)}</span>{steps.map((_, k) => <i key={k} aria-hidden="true" className={k === i ? "on" : ""} />)}</span>
          {!last && <button type="button" className="btn-quiet" onClick={finish}>{t.skipTour}</button>}
          <button type="button" className="btn-solid" onClick={() => (last ? finish() : setI(i + 1))}>{last ? t.start : t.next}</button>
        </div>
      </div>
    </div>
  );
}
