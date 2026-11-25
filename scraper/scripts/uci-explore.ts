// One-off: load a UCI cinema page like a visitor and record what happens. Not used in the pipeline.
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";
import { USER_AGENT } from "../src/http.ts";

const url = process.argv[2] ?? "https://www.ucicinemas.pt/cinemas/el-corte-ingles/";
const out = process.argv[3] ?? "out/uci-explore";
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ locale: "pt-PT", timezoneId: "Europe/Lisbon" });
// Honest identification: the browser's own UA plus ours.
const ua = (await (await ctx.newPage()).evaluate(() => navigator.userAgent)) + ` ${USER_AGENT}`;
await ctx.close();
const context = await browser.newContext({ locale: "pt-PT", timezoneId: "Europe/Lisbon", userAgent: ua });
const page = await context.newPage();
const log: string[] = [];
let n = 0;
page.on("response", async (r) => {
  const ct = r.headers()["content-type"] ?? "";
  log.push(`${r.status()} ${r.request().method()} ${ct.split(";")[0]} ${r.url().slice(0, 160)}`);
  if (ct.includes("json") && !r.url().includes("google")) {
    try { writeFileSync(`${out}/resp-${String(++n).padStart(2, "0")}.json`, JSON.stringify({ url: r.url(), body: await r.json() }, null, 1)); } catch { /* body gone */ }
  }
});
const t0 = Date.now();
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90_000 });
try { await page.waitForURL(/ucicinemas\.pt/, { timeout: 90_000 }); } catch { /* still queued */ }
await page.waitForLoadState("networkidle", { timeout: 60_000 }).catch(() => {});
console.log("UA:", ua);
console.log("final url:", page.url(), `(${((Date.now() - t0) / 1000).toFixed(1)}s)`);
console.log("title:", await page.title());
writeFileSync(`${out}/page.html`, await page.content());
writeFileSync(`${out}/text.txt`, await page.innerText("body").catch(() => ""));
writeFileSync(`${out}/network.txt`, log.join("\n"));
await page.screenshot({ path: `${out}/shot.png`, fullPage: false });
console.log("responses:", log.length, "json saved:", n);
await browser.close();
