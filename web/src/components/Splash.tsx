import { useEffect, useState } from "react";
import { useT } from "../lib/i18n.ts";
import { Facade } from "./Art.tsx";

/**
 * Opening screen (José): the Éden's facade with the muse, then you walk in — the facade grows and fades
 * into the sala. Stays until the programme has loaded (at least ~1.2 s so it reads as an entrance).
 */
export function Splash({ ready }: { ready: boolean }) {
  const { t } = useT();
  const [minDone, setMinDone] = useState(false);
  const [phase, setPhase] = useState<"in" | "out" | "gone">("in");
  useEffect(() => { const id = setTimeout(() => setMinDone(true), 1200); return () => clearTimeout(id); }, []);
  useEffect(() => { if (ready && minDone) setPhase((p) => (p === "in" ? "out" : p)); }, [ready, minDone]);
  useEffect(() => {
    if (phase !== "out") return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const id = setTimeout(() => setPhase("gone"), reduce ? 150 : 750);
    return () => clearTimeout(id);
  }, [phase]);
  if (phase === "gone") return null;
  return (
    <div className={`splash ${phase}`} role="status" aria-label={t.loadingShort}>
      <div className="splash-facade"><Facade /></div>
      {minDone && !ready && <p className="splash-wait">{t.loadingShort}</p>}
    </div>
  );
}
