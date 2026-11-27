// Screens for José's round-3 review: `npx tsx scripts/shoot-round3.ts [baseUrl]` (default the local full stack :8799)
// → design/app-shots/r3-*.png (390×844 @2x) and web/public/og.png (1200×630, the facade, for link previews).
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium, type BrowserContext, type Page } from "playwright";

const base = process.argv[2] ?? "http://127.0.0.1:8799";
const out = fileURLToPath(new URL("../../design/app-shots/", import.meta.url));
mkdirSync(out, { recursive: true });
const UA = {
  iphone: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1",
  android: "Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Mobile Safari/537.36",
};
const b = await chromium.launch();
const errors: string[] = [];
async function ctx(opts: { ua?: string; tourDone?: boolean } = {}): Promise<BrowserContext> {
  const c = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: "dark", serviceWorkers: "block", locale: "pt-PT", timezoneId: "Europe/Lisbon", ...(opts.ua ? { userAgent: opts.ua, isMobile: true, hasTouch: true } : {}) });
  if (opts.tourDone !== false) await c.addInitScript(() => { localStorage.setItem("eden.tour.v1", "1"); localStorage.setItem("eden.install.dismissed", String(Date.now())); });
  return c;
}
const settle = (p: Page) => p.waitForSelector(".splash", { state: "detached", timeout: 15000 });
async function shot(p: Page, name: string) { await p.waitForTimeout(350); await p.screenshot({ path: `${out}r3-${name}.png` }); console.log(name); }
const watch = (p: Page) => { p.on("pageerror", (e) => errors.push(e.message)); p.on("console", (m) => m.type() === "error" && errors.push(m.text())); };

// Programme facts for realistic searches.
const prog = (await (await fetch(`${base}/api/programme`)).json()) as { films: { key: string; title: string }[]; sessions: { filmKey: string; programmeDate: string; id: string; cinemaId: string; startsAt: string }[] };
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(new Date());
const todayKeys = new Set(prog.sessions.filter((s) => s.programmeDate === today).map((s) => s.filmKey));
const later = prog.films.find((f) => !todayKeys.has(f.key) && prog.sessions.some((s) => s.filmKey === f.key && s.programmeDate > today && s.programmeDate <= today.replace(/\d\d$/, (d) => String(Number(d) + 6).padStart(2, "0"))));
const shareId = prog.sessions.find((s) => s.programmeDate === today && s.cinemaId === "nos-odivelas-strada" && s.startsAt.slice(11, 16) >= "21:00")?.id;

{ // home, search, wheel, filters, no-results
  const c = await ctx(); const p = await c.newPage(); watch(p);
  await p.goto(base + "/", { waitUntil: "networkidle" }); await settle(p);
  await shot(p, "01-home");
  await p.locator(".search-field input").fill("dune"); await shot(p, "02-search-dune");
  await p.locator(".search-field input").fill("");
  await p.locator(".fpill-main").first().click(); await p.waitForSelector(".wheel-sheet[open]"); await shot(p, "03-wheel-after");
  await p.locator(".wheel-sheet .btn-solid").click();
  await p.locator(".fpill-main").nth(2).click(); await p.waitForSelector(".wheel-sheet[open]");
  await p.locator(".wheel-sheet .wheel-item", { hasText: "Lisboa" }).click(); await p.waitForTimeout(400);
  await shot(p, "04-wheel-zone");
  await p.locator(".wheel-sheet .btn-solid").click(); await shot(p, "05-filters-on");
  if (later) { await p.goto(`${base}/?q=${encodeURIComponent(later.title)}`, { waitUntil: "networkidle" }); await settle(p); await shot(p, "06-not-today"); }
  await p.goto(`${base}/autor?ver=cinemas&zona=lisboa`, { waitUntil: "networkidle" }); await settle(p); await shot(p, "07-cinemas-zone");
  await c.close();
}
{ // shared link → sheet with the session lit; info sheet
  const c = await ctx(); const p = await c.newPage(); watch(p);
  if (shareId) { await p.goto(`${base}/s/${shareId}`, { waitUntil: "networkidle" }); await settle(p); await p.waitForSelector(".chip.lit"); await p.waitForTimeout(500); await shot(p, "08-shared-session"); }
  await p.goto(base + "/", { waitUntil: "networkidle" }); await settle(p);
  await p.locator('[data-tour="info"]').click(); await p.waitForSelector(".info-sheet[open]"); await shot(p, "09-info");
  await c.close();
}
for (const [phone, ua] of Object.entries(UA)) { // guided tour, first visit
  const c = await ctx({ ua, tourDone: false }); const p = await c.newPage(); watch(p);
  await p.goto(base + "/", { waitUntil: "networkidle" }); await p.waitForSelector(".tour", { timeout: 15000 });
  const steps = await p.locator(".tour-dots i").count();
  for (let i = 1; i <= steps; i++) {
    if (phone === "iphone" || i === steps) await shot(p, `10-tour-${phone}-${i}`);
    if (i < steps) await p.locator(".tour .btn-solid").click();
  }
  await c.close();
}
{ // og.png: the facade splash, 1200×630
  const c = await b.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1, serviceWorkers: "block" });
  const p = await c.newPage();
  await p.goto(base + "/", { waitUntil: "commit" }); await p.waitForSelector(".splash-facade svg"); await p.waitForTimeout(700);
  await p.screenshot({ path: fileURLToPath(new URL("../../web/public/og.png", import.meta.url)) });
  console.log("og.png"); await c.close();
}
console.log(errors.length ? `console errors:\n${errors.join("\n")}` : "no console errors");
await b.close();
