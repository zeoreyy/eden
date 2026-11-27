import { useEffect, useState } from "react";
import { useT } from "../lib/i18n.ts";
import { isStandalone, platform } from "../lib/device.ts";
import { Emblem } from "./Art.tsx";
import { InstallSteps, tourSeen } from "./Tour.tsx";

const KEY = "eden.install.dismissed";
const QUIET_DAYS = 14;

function dismissedRecently(): boolean {
  try { return Date.now() - Number(localStorage.getItem(KEY) ?? 0) < QUIET_DAYS * 86_400_000; } catch { return false; }
}

/**
 * "Add to home screen" pop-up, for people who already did (or skipped) the tour. Same per-phone steps as the
 * tour's last step. Never when installed or on desktop; "Agora não" quiets it for 14 days.
 */
export function InstallPrompt() {
  const { t } = useT();
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (isStandalone() || platform() === "desktop" || dismissedRecently() || !tourSeen()) return;
    const id = setTimeout(() => setShow(true), 4000); // after the splash, once the list is on screen
    return () => clearTimeout(id);
  }, []);
  if (!show) return null;
  const close = () => { setShow(false); try { localStorage.setItem(KEY, String(Date.now())); } catch { /* blocked */ } };
  return (
    <div className="install" role="dialog" aria-labelledby="install-title">
      <Emblem size={34} bg="var(--color-balcao)" />
      <div className="install-text">
        <p id="install-title" className="install-title">{t.installTitleTour}</p>
        <InstallSteps />
        <div className="install-actions">
          <button type="button" className="install-no" onClick={close}>{t.notNow}</button>
        </div>
      </div>
    </div>
  );
}
