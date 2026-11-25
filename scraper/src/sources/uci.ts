// UCI — the public cinema pages, loaded in a real headless browser like a visitor (docs/sources.md §2).
// Never extract the page's embedded API token; never try to get past Queue-it or Cloudflare challenges.
// Status 24 Nov 2026: an honestly identified headless Chromium gets a Cloudflare Turnstile
// ("Confirme que é humano") — even from a residential IP. Then this source fails cleanly and the app
// shows UCI cinemas with their venue link (never hidden). No parser is written until a real page
// has been seen: the DOM/response shape would otherwise be a guess.
import { cinemasForSource } from "@eden/shared";
import { USER_AGENT } from "../http.ts";
import type { SourceResult } from "../types.ts";
import { htmlLines } from "../util.ts";

export type UciBlock = "cloudflare-challenge" | "cloudflare-block" | "queue-it" | null;

/** Recognise the bot walls we must not try to pass. */
export function detectUciBlock(url: string, title: string, html: string): UciBlock {
  if (/queue-it\.net/i.test(url) || /queue-it/i.test(title)) return "queue-it";
  // "Attention Required! | Cloudflare" — "Sorry, you have been blocked" (HTTP 403), seen from GitHub Actions 25 Nov 2026
  if (/^Attention Required/i.test(title) || /you have been blocked/i.test(html)) return "cloudflare-block";
  if (/^(Um momento|Just a moment)/i.test(title) || /challenges\.cloudflare\.com|cdn-cgi\/challenge-platform/.test(html)) {
    return "cloudflare-challenge";
  }
  return null;
}

export async function scrapeUci(): Promise<SourceResult> {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch();
  try {
    const probe = await browser.newContext();
    const baseUa = await (await probe.newPage()).evaluate(() => navigator.userAgent);
    await probe.close();
    const context = await browser.newContext({ locale: "pt-PT", timezoneId: "Europe/Lisbon", userAgent: `${baseUa} ${USER_AGENT}` });
    const warnings: string[] = [];
    for (const c of cinemasForSource("uci")) {
      const page = await context.newPage();
      const res = await page.goto(c.url, { waitUntil: "domcontentloaded", timeout: 90_000 });
      await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
      const [title, html] = [await page.title(), await page.content()];
      const block = res && res.status() === 403 && !detectUciBlock(page.url(), title, html) ? "cloudflare-block" : detectUciBlock(page.url(), title, html);
      await page.close();
      if (block) throw new Error(`${c.shortName}: blocked by ${block} — not bypassing; UCI stays on venue links`);
      // No parser until a real page has been seen. Log what a visitor sees — status, URL, title, visible
      // text only (never the raw HTML: it embeds UCI's API token, and CI logs are public).
      const lines = htmlLines(html);
      console.log(`  UCI ${c.shortName}: HTTP ${res?.status()} ${page.url()} — "${title}" — ${lines.length} text lines:`);
      for (const l of lines.slice(0, 80)) console.log(`    | ${l.slice(0, 140)}`);
      warnings.push(`${c.shortName}: page loaded (HTTP ${res?.status()}, "${title}") but no parser yet`);
    }
    return { source: "uci", sessions: [], warnings };
  } finally {
    await browser.close();
  }
}
