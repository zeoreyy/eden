import { useEffect, useRef, type ReactNode } from "react";
import { useT } from "../lib/i18n.ts";

/**
 * Bottom sheet with the arched top (film sheet, info, filter wheels).
 * - native <dialog> (Escape and the backdrop close it)
 * - slides up; swipe down to close (from the handle/top, or anywhere once scrolled to the top)
 * - focus lands on the sheet itself, not on the handle — no focus box after a tap (José's screenshot)
 */
export function Sheet({ label, onClose, children, className = "" }: { label: string; onClose: () => void; children: ReactNode; className?: string }) {
  const { t } = useT();
  const dialog = useRef<HTMLDialogElement>(null);
  const body = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const d = dialog.current!;
    if (!d.open) d.showModal();
    body.current?.focus({ preventScroll: true });
    document.documentElement.classList.add("sheet-open");
    return () => document.documentElement.classList.remove("sheet-open");
  }, []);

  // Swipe down to close. Touch only (mouse users have the handle, Escape and the backdrop).
  useEffect(() => {
    const el = body.current!;
    let startY = 0, startT = 0, dy = 0, dragging = false, fromTop = false;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const onStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      fromTop = !!target.closest(".sheet-grip") || el.scrollTop <= 0;
      startY = e.touches[0]!.clientY; startT = performance.now(); dy = 0; dragging = false;
    };
    const onMove = (e: TouchEvent) => {
      if (!fromTop) return;
      dy = e.touches[0]!.clientY - startY;
      if (dy <= 0) { if (dragging) { el.style.transform = ""; dragging = false; } return; }
      dragging = true;
      e.preventDefault(); // stop the page from scrolling while the sheet follows the finger
      el.style.transition = "none";
      el.style.transform = `translateY(${dy}px)`;
    };
    const onEnd = () => {
      if (!dragging) return;
      const fast = dy / Math.max(1, performance.now() - startT) > 0.6;
      el.style.transition = reduce ? "none" : "transform .2s ease-out";
      if (dy > 90 || fast) {
        el.style.transform = `translateY(${el.offsetHeight}px)`;
        setTimeout(onClose, reduce ? 0 : 180);
      } else {
        el.style.transform = "";
      }
      dragging = false;
    };
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    return () => { el.removeEventListener("touchstart", onStart); el.removeEventListener("touchmove", onMove); el.removeEventListener("touchend", onEnd); };
  }, [onClose]);

  return (
    <dialog ref={dialog} className={`sheet ${className}`} aria-label={label}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClick={(e) => { if (e.target === dialog.current) onClose(); }}>
      <div ref={body} className="sheet-body" tabIndex={-1}>
        <button type="button" className="sheet-close sheet-grip" onClick={onClose} aria-label={t.close}><span aria-hidden="true" /></button>
        {children}
      </div>
    </dialog>
  );
}
