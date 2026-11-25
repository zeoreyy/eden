// Phone screenshots of every screen: `npx tsx scripts/shoot-app.ts [baseUrl]` (default http://localhost:5173)
// → design/app-shots/<name>.png at 390×844, deviceScaleFactor 2.
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium, type Page } from "playwright";

const base = process.argv[2] ?? "http://localhost:5173";
const out = fileURLToPath(new URL("../../design/app-shots/", import.meta.url));
mkdirSync(out, { recursive: true });

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: "dark", locale: "pt-PT", timezoneId: "Europe/Lisbon", serviceWorkers: "block" });
const page = await ctx.newPage();
const errors: string[] = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

async function shot(name: string, path: string, act?: (p: Page) => Promise<void>) {
  await page.goto(base + path, { waitUntil: path === "/" && name === "10-splash" ? "commit" : "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  if (act) await act(page);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${out}${name}.png` });
  console.log(name);
}

const settle = (p: Page) => p.waitForSelector(".splash", { state: "detached", timeout: 15000 }).then(() => {});
await shot("01-semana-hoje", "/", settle);
await shot("02-scrolled", "/", (p) => settle(p).then(() => p.evaluate(() => scrollTo(0, 700))).then(() => {}));
await shot("03-film-sheet", "/", (p) => settle(p).then(() => p.locator(".film h3 button").first().click()));
await shot("04-semana-sabado", "/", (p) => settle(p).then(() => p.locator(".days button").nth(3).click()));
await shot("05-comercial", "/comercial", settle);
await shot("06-colombo", "/comercial/nos-colombo", settle);
await shot("07-autor", "/autor", settle);
await shot("08-cinemateca-quinta", "/autor/cinemateca", (p) => settle(p).then(() => p.locator(".days button").nth(1).click()));
await shot("09-en", "/", (p) => settle(p).then(() => p.locator(".lang").click()));
await page.evaluate(() => localStorage.removeItem("eden.lang"));
await shot("10-splash", "/", (p) => p.waitForTimeout(500));
// iPhone Safari: the add-to-home-screen pop-up (appears ~4 s after load)
const ios = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: "dark", serviceWorkers: "block",
  userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1" });
const ip = await ios.newPage();
await ip.goto(base + "/", { waitUntil: "networkidle" });
await ip.waitForSelector(".install", { timeout: 15000 });
await ip.screenshot({ path: `${out}11-install-ios.png` });
console.log("11-install-ios");

console.log(errors.length ? `console errors:\n${errors.join("\n")}` : "no console errors");
await b.close();
