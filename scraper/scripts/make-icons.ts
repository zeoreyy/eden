// Render web/public/icon.svg into the PNG app icons (run after changing the emblem).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const dir = fileURLToPath(new URL("../../web/public/", import.meta.url));
const svg = readFileSync(`${dir}icon.svg`, "utf8");
const b = await chromium.launch();
const page = await b.newPage();
for (const [name, size, maskable] of [["icon-192.png", 192, false], ["icon-512.png", 512, false], ["icon-maskable-512.png", 512, true], ["apple-touch-icon.png", 180, true]] as const) {
  // Maskable / iOS: full-bleed square (the OS applies its own mask); emblem stays inside the 80% safe zone.
  const body = maskable ? svg.replace('rx="112"', 'rx="0"') : svg;
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${body.replace("<svg ", `<svg width="${size}" height="${size}" `)}</body></html>`);
  await page.screenshot({ path: `${dir}${name}`, omitBackground: !maskable });
  console.log(name);
}
await b.close();
