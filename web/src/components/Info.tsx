import { useEffect, useState } from "react";
import { useT } from "../lib/i18n.ts";
import { onToast, prepareShareVideo, shareApp } from "../lib/share.ts";
import { Emblem } from "./Art.tsx";
import { ShareGlyph } from "./Session.tsx";
import { Sheet } from "./Sheet.tsx";

/** Public feedback address — José's choice (27 Nov 2026). */
const FEEDBACK_EMAIL = "zemariaorey@gmail.com";

/** "i" in the header → what eden is, how it works, share it, send feedback. */
export function InfoSheet({ onClose, onTour }: { onClose: () => void; onTour: () => void }) {
  const { t } = useT();
  useEffect(() => { prepareShareVideo(); }, []);
  return (
    <Sheet label={t.about} onClose={onClose} className="info-sheet">
      <div className="info">
        <Emblem size={34} bg="var(--color-balcao)" />
        <h2 translate="no">eden</h2>
        <p className="info-line">{t.aboutLine}</p>
        <div className="info-actions">
          <button type="button" className="btn-line" onClick={onTour}>{t.howItWorks}</button>
          <button type="button" className="btn-line" onClick={() => void shareApp(t)}>
            <ShareGlyph size={12} /> {t.shareApp}
          </button>
          <a className="btn-line" href={`mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(t.feedbackSubject)}`}>{t.feedback}</a>
        </div>
      </div>
    </Sheet>
  );
}

/** One quiet message at a time ("Link copiado"). */
export function Toaster() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    let id: ReturnType<typeof setTimeout>;
    const off = onToast((m) => { setMsg(m); clearTimeout(id); id = setTimeout(() => setMsg(null), 2200); });
    return () => { off(); clearTimeout(id); };
  }, []);
  return <div className="toast-slot" role="status" aria-live="polite">{msg && <span className="toast">{msg}</span>}</div>;
}
