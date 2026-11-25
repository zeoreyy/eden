// axe-core scan of every screen at phone size: `npx tsx scripts/a11y.ts [baseUrl]`
import AxeBuilder from "@axe-core/playwright";
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://localhost:5173";
const b = await chromium.launch();
const page = await (await b.newContext({ viewport: { width: 390, height: 844 }, colorScheme: "dark", serviceWorkers: "block" })).newPage();
const screens: [string, string, ((p: typeof page) => Promise<unknown>)?][] = [
  ["hoje", "/"], ["sheet", "/", (p) => p.locator(".film h3 button").first().click()], ["semana", "/semana"],
  ["comercial", "/comercial"], ["cinema", "/comercial/nos-colombo"], ["autor", "/autor"], ["cinemateca", "/autor/cinemateca"],
];
let total = 0;
for (const [name, path, act] of screens) {
  await page.goto(base + path, { waitUntil: "networkidle" });
  if (act) { await act(page); await page.waitForTimeout(300); }
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  total += r.violations.length;
  console.log(`${name}: ${r.violations.length} violations`);
  for (const v of r.violations) console.log(`  [${v.impact}] ${v.id}: ${v.help} — ${v.nodes.length} nodes, e.g. ${v.nodes[0]?.target.join(" ")}`);
}
console.log(total ? `${total} violation types` : "no violations");
await b.close();
