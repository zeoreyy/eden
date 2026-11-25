// Screenshot the design style tile at phone size: `npx tsx scripts/shoot-tile.ts [a,b] [pedra,veludo]`
// → design/style-tile/shots/tile-<pair>-<accent>.png (390 px wide, deviceScaleFactor 2, full page, dark).
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const tile = new URL("../../design/style-tile/index.html", import.meta.url);
const out = fileURLToPath(new URL("../../design/style-tile/shots/", import.meta.url));
mkdirSync(out, { recursive: true });
const pairs = (process.argv[2] ?? "a,b").split(",");
const accents = (process.argv[3] ?? "pedra,veludo").split(",");

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: "dark" });
const page = await ctx.newPage();
for (const p of pairs) for (const a of accents) {
  await page.goto(`${tile.href}?p=${p}&a=${a}`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const file = `${out}tile-${p}-${a}.png`;
  await page.screenshot({ path: file, fullPage: true });
  console.log(file);
}
await browser.close();
