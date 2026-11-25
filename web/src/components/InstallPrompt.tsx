import { useEffect, useState } from "react";
import { useT } from "../lib/i18n.ts";
import { Emblem } from "./Art.tsx";

/** Chrome/Android's install event (not in TS's DOM lib). */
interface InstallEvent extends Event { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> }

const KEY = "eden.install.dismissed";
const QUIET_DAYS = 14;

function dismissedRecently(): boolean {
  try { return Date.now() - Number(localStorage.getItem(KEY) ?? 0) < QUIET_DAYS * 86_400_000; } catch { return false; }
}
const standalone = () => matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

/**
 * "Add to home screen" pop-up (José). Android/Chrome: the real install button. iOS Safari has no install
 * API, so it shows the two taps. Never when already installed; "Agora não" quiets it for 14 days.
 */
export function InstallPrompt() {
  const { t } = useT();
  const [evt, setEvt] = useState<InstallEvent | null>(null);
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (standalone() || dismissedRecently()) return;
    const onEvt = (e: Event) => { e.preventDefault(); setEvt(e as InstallEvent); };
    addEventListener("beforeinstallprompt", onEvt);
    const id = setTimeout(() => setShow(true), 4000); // after the splash, once the list is on screen
    return () => { removeEventListener("beforeinstallprompt", onEvt); clearTimeout(id); };
  }, []);
  const ios = typeof navigator !== "undefined" && isIos();
  if (!show || (!evt && !ios)) return null;
  const close = () => { setShow(false); try { localStorage.setItem(KEY, String(Date.now())); } catch { /* blocked */ } };
  return (
    <div className="install" role="dialog" aria-labelledby="install-title">
      <Emblem size={34} bg="var(--color-balcao)" />
      <div className="install-text">
        <p id="install-title" className="install-title">{t.installTitle}</p>
        <p>{ios ? <IosSteps text={t.installIos} /> : t.installAndroid}</p>
        <div className="install-actions">
          {evt && <button type="button" className="install-go" onClick={async () => { await evt.prompt(); await evt.userChoice; setEvt(null); close(); }}>{t.install}</button>}
          <button type="button" className="install-no" onClick={close}>{t.notNow}</button>
        </div>
      </div>
    </div>
  );
}

/** Puts the iOS share glyph (drawn here, not an icon font) next to the word "Partilhar"/"Share". */
function IosSteps({ text }: { text: string }) {
  const [before, after] = text.split(/(?<=Partilhar|Share)/);
  return (
    <>{before}<svg className="share-glyph" width="14" height="17" viewBox="0 0 14 17" aria-hidden="true"><path d="M7 1v10M3.5 4.5 7 1l3.5 3.5M4 7H1.5v9h11V7H10" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>{after}</>
  );
}
