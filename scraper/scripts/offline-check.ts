// PWA check: after one visit, the app and the last programme load with no network.
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
const base = process.argv[2] ?? "https://eden.zeorey.workers.dev";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: "dark" });
const page = await ctx.newPage();
await page.goto(base, { waitUntil: "networkidle" });
await page.evaluate(async () => { await navigator.serviceWorker.ready; });
await page.reload({ waitUntil: "networkidle" }); // now SW-controlled: /api/programme goes into its cache
await page.waitForTimeout(1500);
await ctx.setOffline(true);
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForSelector(".film", { timeout: 15000 });
const films = await page.locator(".film").count();
const note = await page.locator(".offline").textContent().catch(() => null);
await page.screenshot({ path: fileURLToPath(new URL("../../design/app-shots/11-offline.png", import.meta.url)) });
console.log(`offline: ${films} films rendered; note: ${note}`);
await b.close();
