import { useEffect, useRef, type ReactNode } from "react";
import { useT } from "../lib/i18n.ts";

/**
 * Bottom sheet with the arched top (film sheet, info, filter wheels).
 * - native <dialog> (Escape and the backdrop close it)
 * - slides up; closed with the arrow button (no swipe: it fought the scroll wheels — José)
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

  return (
    <dialog ref={dialog} className={`sheet ${className}`} aria-label={label}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClick={(e) => { if (e.target === dialog.current) onClose(); }}>
      <div ref={body} className="sheet-body" tabIndex={-1}>
        <button type="button" className="sheet-close" onClick={onClose} aria-label={t.close}>
          <svg width="22" height="12" viewBox="0 0 22 12" aria-hidden="true"><path d="M2 2l9 8 9-8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        {children}
      </div>
    </dialog>
  );
}
