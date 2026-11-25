/** Original artwork (decision #27): the muse emblem, the facade at night, the sala as a faint backdrop. */

/** Muse of the facade relief inside the stepped crown. Inherits `color`; `bg` fills the robe/head. */
export function Emblem({ size = 28, bg = "var(--color-sala)", title }: { size?: number; bg?: string; title?: string }) {
  return (
    <svg width={size} height={Math.round(size * 1.1)} viewBox="0 0 120 132" role={title ? "img" : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <path d="M6 128 V44 H18 V26 H32 V6 H88 V26 H102 V44 H114 V128 Z" fill="none" stroke="currentColor" strokeWidth="2.6" />
      <path d="M12 128 V50 H24 V32 H38 V12 H82 V32 H96 V50 H108 V128" fill="none" stroke="currentColor" strokeWidth="1" opacity=".55" />
      <Muse x={22} y={18} w={76} h={104} bg={bg} />
    </svg>
  );
}

function Muse({ x, y, w, h, bg }: { x: number; y: number; w: number; h: number; bg: string }) {
  return (
    <svg x={x} y={y} width={w} height={h} viewBox="0 0 120 124">
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path d="M53 46 L49 108 H71 L67 46 Z" fill={bg} strokeWidth="2.4" />
        <path d="M56.5 53 V108 M60 53 V108 M63.5 53 V108" strokeWidth="1.3" />
        <path d="M53 48 Q47 66 49 84 M67 48 Q73 66 71 84" strokeWidth="1.3" opacity=".7" />
        <path d="M53.5 47 L44 28 L40 12 M66.5 47 L76 28 L80 12" strokeWidth="2.6" />
        <circle cx="40" cy="10" r="2.2" fill="currentColor" stroke="none" />
        <circle cx="80" cy="10" r="2.2" fill="currentColor" stroke="none" />
        <circle cx="60" cy="37" r="6.5" fill={bg} strokeWidth="2.4" />
        <path d="M42 113 H78 M34 119 H86" strokeWidth="2.4" />
      </g>
    </svg>
  );
}

const JOINTS = (() => {
  const d: string[] = [];
  for (let y = 22, row = 0; y < 282; y += 21, row++) {
    d.push(`M0 ${y}H390`);
    for (let x = (row % 2) * 34 + 12; x < 390; x += 68) d.push(`M${x} ${y}V${y + 21}`);
  }
  return d.join("");
})();
const DENTILS = Array.from({ length: 45 }, (_, i) => 60 + i * 6);
const TOWER_FINS: [number, number, number, number][] = [
  [29, 15, 2.2, 11], [34.8, 15, 2.2, 11],
  [23, 31, 2, 11], [28.5, 31, 2, 11], [35.5, 31, 2, 11], [41, 31, 2, 11],
  [17, 47, 2, 13], [22.5, 47, 2, 13], [28, 47, 2, 13], [36, 47, 2, 13], [41.5, 47, 2, 13], [47, 47, 2, 13],
];

/** The Éden's facade at night: stepped crown, cast lettering, the muse relief, lit towers and glazing. */
export function Facade() {
  const tower = (
    <>
      <path d="M14 62 V44 H20 V28 H26 V12 H40 V28 H46 V44 H52 V62 Z" fill="#2c2621" />
      <g fill="url(#f-glass)" filter="url(#f-glow)">
        {TOWER_FINS.map(([x, y, w, h]) => <rect key={`${x}-${y}`} x={x} y={y} width={w} height={h} />)}
      </g>
    </>
  );
  return (
    <svg className="facade" viewBox="0 0 390 300" role="img" aria-label="eden — fachada do Éden Teatro à noite">
      <defs>
        <linearGradient id="f-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0b0a0c" /><stop offset="1" stopColor="#15120f" /></linearGradient>
        <linearGradient id="f-stone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3b302c" /><stop offset=".55" stopColor="#5e4c45" /><stop offset="1" stopColor="#8a7266" /></linearGradient>
        <linearGradient id="f-glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff1dc" stopOpacity=".95" /><stop offset="1" stopColor="#f0c9a0" stopOpacity=".7" /></linearGradient>
        <linearGradient id="f-recess" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1f1b17" /><stop offset="1" stopColor="#3a3129" /></linearGradient>
        <radialGradient id="f-flood" cx="50%" cy="100%" r="70%"><stop offset="0" stopColor="#fff1dc" stopOpacity=".18" /><stop offset="1" stopColor="#fff1dc" stopOpacity="0" /></radialGradient>
        <filter id="f-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <filter id="f-cast" x="-10%" y="-10%" width="130%" height="140%"><feDropShadow dx="1.4" dy="2" stdDeviation=".7" floodColor="#000" floodOpacity=".65" /></filter>
        <clipPath id="f-stoneClip">
          <path d="M58 300 V84 H104 V42 H120 V22 H270 V42 H286 V84 H332 V300 Z" />
          <path d="M8 300 V62 H58 V300 Z M332 300 V62 H382 V300 Z" />
        </clipPath>
      </defs>
      <rect width="390" height="300" fill="url(#f-sky)" />
      <g>{tower}</g>
      <g transform="translate(390 0) scale(-1 1)">{tower}</g>
      <g clipPath="url(#f-stoneClip)">
        <rect width="390" height="300" fill="url(#f-stone)" />
        <rect width="390" height="300" fill="url(#f-flood)" />
        <path d={JOINTS} stroke="#000" strokeOpacity=".16" strokeWidth=".6" />
      </g>
      <path d="M58 84 H104 V42 H120 V22 H270 V42 H286 V84 H332" fill="none" stroke="#fff1dc" strokeOpacity=".28" />
      <path d="M8 62 H58 M332 62 H382" stroke="#fff1dc" strokeOpacity=".2" />
      <g fill="url(#f-glass)" filter="url(#f-glow)" opacity=".85">
        <rect x="27" y="74" width="12" height="196" /><rect x="351" y="74" width="12" height="196" />
      </g>
      <g stroke="#2c2621" strokeWidth="1.2">
        <path d="M27 96H39M27 118H39M27 140H39M27 162H39M27 184H39M27 206H39M27 228H39M27 250H39M33 74V270" />
        <path d="M351 96H363M351 118H363M351 140H363M351 162H363M351 184H363M351 206H363M351 228H363M351 250H363M357 74V270" />
      </g>
      <g fill="#23201d" filter="url(#f-cast)" textAnchor="middle">
        <text x="195" y="58" fontFamily="Limelight" fontSize="29" letterSpacing="1.5">eden</text>
        <rect x="185" y="65" width="20" height="1.6" /><rect x="185" y="68.6" width="20" height="1.6" />
        <text x="195" y="80.5" fontFamily="Jost" fontWeight="600" fontSize="7.5" letterSpacing="3.4">·&#8202;LISBOA&#8202;·</text>
      </g>
      <rect x="134" y="96" width="122" height="86" fill="url(#f-recess)" />
      <path d="M130 96 H260" stroke="#fff1dc" strokeOpacity=".3" strokeWidth="2" />
      <g style={{ color: "#cdb79c" }}><Muse x={152} y={100} w={86} h={80} bg="#2b251f" /></g>
      <g fill="url(#f-glass)" opacity=".5" filter="url(#f-glow)">
        <rect x="76" y="110" width="30" height="150" /><rect x="284" y="110" width="30" height="150" /><rect x="150" y="200" width="90" height="60" />
      </g>
      <g stroke="#3b302c" strokeWidth="1.4">
        <path d="M86 110V260M96 110V260M76 135H106M76 160H106M76 185H106M76 210H106M76 235H106" />
        <path d="M294 110V260M304 110V260M284 135H314M284 160H314M284 185H314M284 210H314M284 235H314" />
        <path d="M165 200V260M180 200V260M195 200V260M210 200V260M225 200V260M150 220H240M150 240H240" />
      </g>
      <g fill="#6f5b52">
        <rect x="66" y="100" width="8" height="166" /><rect x="108" y="100" width="8" height="166" />
        <rect x="274" y="100" width="8" height="166" /><rect x="316" y="100" width="8" height="166" />
      </g>
      <g fill="#2a241f">{DENTILS.map((x) => <rect key={x} x={x} y="272" width="3.2" height="8" />)}</g>
      <rect x="0" y="282" width="390" height="18" fill="#141110" />
      <path d="M0 282 H390" stroke="#fff1dc" strokeOpacity=".5" filter="url(#f-glow)" />
    </svg>
  );
}

const SEATS = (() => {
  const d: string[] = [];
  for (let k = 0; k < 11; k++) {
    const t = k / 10, y = 184 + 62 * Math.pow(t, 1.3), w = 5 + 9 * t, h = 2.6 + 5 * t, gap = 2 + 1.6 * t;
    const half = 92 + 120 * t, aisle = 6 + 16 * t;
    for (const side of [-1, 1]) {
      for (let x = aisle; x + w <= half; x += w + gap) {
        const cx = 195 + side * (x + w / 2), l = cx - w / 2, r = cx + w / 2, f = (n: number) => n.toFixed(1);
        d.push(`M${f(l)} ${f(y + h)}V${f(y + h * .45)}Q${f(l)} ${f(y)} ${f(cx)} ${f(y)}Q${f(r)} ${f(y)} ${f(r)} ${f(y + h * .45)}V${f(y + h)}`);
      }
    }
  }
  return d.join("");
})();

/** The sala seen from the seats, as a faint backdrop behind page titles (no framed screen — José). */
export function SalaBackdrop() {
  return (
    <svg className="sala" viewBox="0 0 390 250" preserveAspectRatio="xMidYMin slice" aria-hidden="true">
      <defs>
        <radialGradient id="s-glow" cx="50%" cy="45%" r="55%"><stop offset="0" stopColor="#fff1dc" stopOpacity=".2" /><stop offset="1" stopColor="#fff1dc" stopOpacity="0" /></radialGradient>
        <linearGradient id="s-strip" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff1dc" /><stop offset="1" stopColor="#fff1dc" stopOpacity=".25" /></linearGradient>
        <linearGradient id="s-curtain" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#3d1216" /><stop offset=".5" stopColor="#5c1c22" /><stop offset="1" stopColor="#3d1216" /></linearGradient>
        <filter id="s-blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      <path d="M0 0 H390 V52 L270 84 H120 L0 52 Z" fill="#1b1714" />
      <path d="M0 52 Q195 -26 390 52" fill="none" stroke="#fff1dc" strokeOpacity=".12" />
      <g filter="url(#s-blur)">
        <path d="M152 0 H162 L190 84 H187 Z" fill="url(#s-strip)" />
        <path d="M190 0 H200 L196.5 84 H193.5 Z" fill="url(#s-strip)" />
        <path d="M228 0 H238 L203 84 H200 Z" fill="url(#s-strip)" />
      </g>
      <path d="M0 52 L120 84 V178 L0 232 Z" fill="#191512" />
      <path d="M390 52 L270 84 V178 L390 232 Z" fill="#191512" />
      <g stroke="#fff1dc" strokeLinecap="round" filter="url(#s-blur)">
        <path d="M4 74 L112 98" strokeWidth="2.4" /><path d="M4 86 L112 106" strokeWidth="2" strokeOpacity=".8" /><path d="M4 98 L112 114" strokeWidth="1.6" strokeOpacity=".6" />
        <path d="M386 74 L278 98" strokeWidth="2.4" /><path d="M386 86 L278 106" strokeWidth="2" strokeOpacity=".8" /><path d="M386 98 L278 114" strokeWidth="1.6" strokeOpacity=".6" />
      </g>
      <g fill="#231e19" stroke="#fff1dc" strokeOpacity=".14"><path d="M0 132 L120 140 V150 L0 150 Z" /><path d="M390 132 L270 140 V150 L390 150 Z" /></g>
      <path d="M0 158 L120 156 H270 L390 158" fill="none" stroke="#fff1dc" strokeWidth="1.6" strokeOpacity=".75" filter="url(#s-blur)" />
      <rect x="120" y="84" width="150" height="94" fill="#120f0d" />
      <rect x="120" y="86" width="16" height="92" fill="url(#s-curtain)" /><rect x="254" y="86" width="16" height="92" fill="url(#s-curtain)" />
      <rect x="140" y="94" width="110" height="62" fill="#fff1dc" opacity=".16" />
      <rect width="390" height="250" fill="url(#s-glow)" />
      <path d="M110 178 H280" stroke="#fff1dc" strokeOpacity=".35" />
      <path d={SEATS} fill="#0b0908" stroke="#fff1dc" strokeOpacity=".14" strokeWidth=".7" />
    </svg>
  );
}
