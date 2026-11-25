// Close-up of one element of the style tile: `npx tsx scripts/shoot-el.ts ".vault" a dark out.png`
import { chromium } from "playwright";
const [sel = ".vault", p = "a", t = "dark", out = "el.png"] = process.argv.slice(2);
const tile = new URL("../../design/style-tile/index.html", import.meta.url);
const b = await chromium.launch();
const page = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, colorScheme: t as "dark" })).newPage();
await page.goto(`${tile.href}?p=${p}&t=${t}`, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.locator(sel).first().screenshot({ path: out });
await b.close();
