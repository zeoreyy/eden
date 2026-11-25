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
  await page.goto(base + path, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  if (act) await act(page);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${out}${name}.png` });
  console.log(name);
}

await shot("01-hoje", "/");
await shot("02-hoje-scrolled", "/", (p) => p.evaluate(() => scrollTo(0, 520)).then(() => {}));
await shot("03-film-sheet", "/", (p) => p.locator(".film h3 button").first().click());
await shot("04-semana", "/semana");
await shot("05-semana-next-week", "/semana", (p) => p.locator(".days button").nth(3).click());
await shot("06-comercial", "/comercial");
await shot("07-comercial-cinema", "/comercial/nos-colombo");
await shot("08-autor", "/autor");
await shot("09-autor-cinema", "/autor/cinemateca", (p) => p.locator(".days button").nth(1).click());
await shot("10-hoje-en", "/", (p) => p.locator(".lang").click());
await page.evaluate(() => localStorage.removeItem("eden.lang"));
console.log(errors.length ? `console errors:\n${errors.join("\n")}` : "no console errors");
await b.close();
