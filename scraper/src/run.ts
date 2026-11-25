// Orchestrator.
//   --dry        write ./out/programme.json instead of publishing to KV
//   --only a,b   scrape only these sources (others keep their previous data)
//   --reuse      don't scrape: rebuild from ./out/raw-*.json of the last run (no requests to cinemas)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { CINEMA_BY_ID, type Programme, type SourceId } from "@eden/shared";
import { ALL_SOURCES, buildProgramme, type BuildReport } from "./build.ts";
import { noMatcher, tmdbMatcher } from "./match.ts";
import { kvConfig, loadPublished, publish } from "./publish.ts";
import { noRatings, omdbRatings } from "./ratings.ts";
import type { RawSession, Scraper, SourceResult } from "./types.ts";
import { lisbonToday } from "./util.ts";
import { scrapeNos } from "./sources/nos.ts";
import { scrapeIdeal } from "./sources/ideal.ts";
import { scrapeCinemateca } from "./sources/cinemateca.ts";
import { scrapeNimas } from "./sources/nimas.ts";
import { scrapeCinemaCity } from "./sources/cinemacity.ts";
import { scrapeFernandoLopes } from "./sources/fernandolopes.ts";
import { scrapeSaoJorge } from "./sources/saojorge.ts";
import { scrapeUci } from "./sources/uci.ts";

const SCRAPERS: Record<SourceId, Scraper> = {
  nos: scrapeNos,
  ideal: scrapeIdeal,
  cinemateca: scrapeCinemateca,
  nimas: scrapeNimas,
  cinemacity: scrapeCinemaCity,
  fernandolopes: scrapeFernandoLopes,
  saojorge: scrapeSaoJorge,
  uci: scrapeUci,
};

const ENV_FILE = fileURLToPath(new URL("../../.env", import.meta.url));

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function table(head: string[], rows: string[][]): string {
  const w = head.map((h, i) => Math.max(h.length, ...rows.map((c) => (c[i] ?? "").length)));
  const line = (c: string[]) => c.map((v, i) => (v ?? "").padEnd(w[i]!)).join("  ").trimEnd();
  return [line(head), line(w.map((n) => "-".repeat(n))), ...rows.map(line)].join("\n");
}

export function summarise(r: SourceResult, today = lisbonToday(), maxRows = 25): string {
  const s = r.sessions.slice().sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const dates = [...new Set(s.map((x) => x.date))].sort();
  const last = dates.at(-1);
  const films = new Set(s.map((x) => x.film.title));
  const out = [
    `■ ${r.source}: ${s.length} sessions, ${films.size} films, ${new Set(s.map((x) => x.cinemaId)).size} cinemas, dates ${dates[0] ?? "-"} → ${last ?? "-"} (${dates.length} days)`,
    ...r.warnings.map((w) => `  ⚠ ${w}`),
  ];
  const rowsOf = (rows: RawSession[]) => rows.map((x) => [
    x.date, x.time, CINEMA_BY_ID.get(x.cinemaId)?.shortName ?? x.cinemaId,
    x.film.title.slice(0, 38), [x.room, x.label].filter(Boolean).join(" · ").slice(0, 28), x.urlKind,
  ]);
  for (const d of [today, last]) {
    if (!d || (d === last && d === today && out.length > 2)) continue;
    const rows = s.filter((x) => x.date === d);
    out.push(`\n  ${d === today ? "TODAY" : "FURTHEST"} ${d}: ${rows.length} sessions${rows.length > maxRows ? ` (first ${maxRows})` : ""}`);
    if (rows.length) out.push(table(["date", "time", "cinema", "film", "room/label", "url"], rowsOf(rows.slice(0, maxRows))).replace(/^/gm, "  "));
  }
  return out.join("\n");
}

export function programmeReport(p: Programme, report: BuildReport, today = lisbonToday()): string {
  const matched = report.rows.filter((r) => r.film.tmdbId).sort((a, b) => b.sessions - a.sessions);
  const unmatched = report.rows.filter((r) => !r.film.tmdbId).sort((a, b) => b.sessions - a.sessions);
  const cut = (s: string | undefined, n: number) => (s ?? "").slice(0, n);
  const filmCols = (r: (typeof report.rows)[number]) => [
    cut(r.film.title, 40), cut(r.film.originalTitle, 30), String(r.film.year ?? ""), String(r.film.runtimeMin ?? ""),
    r.film.imdb?.toFixed(1) ?? "", String(r.sessions), String(r.cinemas), r.how,
  ];
  const head = ["title", "original", "year", "min", "IMDb", "sess", "cin", "match"];
  const ok = Object.entries(p.sources).map(([id, s]) =>
    `  ${s.ok ? "✓" : "✗"} ${id.padEnd(14)} ${s.ok ? "fresh" : `last good: ${s.lastSuccess ?? "never"}`}${s.note ? ` — ${s.note}` : ""}`);
  const filmByKey = new Map(p.films.map((f) => [f.key, f]));
  const picks = (p.topPicks[today] ?? []).map((k, i) => {
    const n = new Set(p.sessions.filter((s) => s.filmKey === k && s.programmeDate === today && CINEMA_BY_ID.get(s.cinemaId)?.kind === "commercial").map((s) => s.cinemaId)).size;
    return `  ${i + 1}. ${filmByKey.get(k)?.title} (${n} commercial cinemas today)`;
  });
  return [
    `programme: ${p.films.length} films, ${p.sessions.length} sessions, generated ${p.generatedAt}`,
    "sources:", ...ok,
    `\nMATCHED (${matched.length})`, table(head, matched.map(filmCols)),
    `\nUNMATCHED (${unmatched.length}) — no TMDB match; shown with cinema data only, no ratings`,
    table(["title", "", "year", "min", "", "sess", "cin", "variants"], unmatched.map((r) => [...filmCols(r).slice(0, 7), r.titles.length > 1 ? r.titles.join(" / ").slice(0, 60) : ""])),
    `\nTOP PICKS ${today}`, ...(picks.length ? picks : ["  (none)"]),
    ...(report.warnings.length ? ["\nwarnings:", ...report.warnings.map((w) => `  ⚠ ${w}`)] : []),
  ].join("\n");
}

async function collect(ids: SourceId[], reuse: boolean): Promise<Partial<Record<SourceId, SourceResult | Error>>> {
  const results: Partial<Record<SourceId, SourceResult | Error>> = {};
  for (const id of ids) {
    const file = `out/raw-${id}.json`;
    if (reuse) {
      if (!existsSync(file)) { results[id] = new Error("no saved raw output (--reuse)"); continue; }
      const saved = JSON.parse(readFileSync(file, "utf8"));
      results[id] = saved.error ? new Error(saved.error) : saved;
      continue;
    }
    const t0 = Date.now();
    try {
      const r = await SCRAPERS[id]();
      writeFileSync(file, JSON.stringify(r, null, 1));
      results[id] = r;
      console.log(summarise(r));
      console.log(`  (${((Date.now() - t0) / 1000).toFixed(1)}s, raw → scraper/${file})\n`);
    } catch (e) {
      const err = e as Error;
      writeFileSync(file, JSON.stringify({ source: id, error: err.message }));
      results[id] = err;
      console.error(`✗ ${id} failed: ${err.message}\n`);
    }
  }
  return results;
}

async function main() {
  if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);
  const dry = process.argv.includes("--dry");
  const reuse = process.argv.includes("--reuse");
  const only = arg("only")?.split(",") as SourceId[] | undefined;
  const ids = ALL_SOURCES.filter((id) => !only || only.includes(id));
  const kv = dry ? undefined : kvConfig(); // fail before scraping if publishing can't work
  mkdirSync("out", { recursive: true });

  const results = await collect(ids, reuse);
  const today = lisbonToday();
  const { TMDB_API_KEY, OMDB_API_KEY } = process.env;
  if (!TMDB_API_KEY) console.warn("⚠ TMDB_API_KEY not set — films stay unmatched (no year/poster from TMDB, no ratings).");
  if (!OMDB_API_KEY) console.warn("⚠ OMDB_API_KEY not set — no ratings.");
  const matcher = TMDB_API_KEY ? tmdbMatcher(TMDB_API_KEY, today) : noMatcher;
  const ratings = OMDB_API_KEY ? omdbRatings(OMDB_API_KEY) : noRatings;
  // Last good data: the published programme (real runs) or the last local one (--dry).
  const previous = kv
    ? await loadPublished(kv)
    : existsSync("out/programme.json") ? (JSON.parse(readFileSync("out/programme.json", "utf8")) as Programme) : undefined;

  const { programme, report } = await buildProgramme({ results, previous, matcher, ratings });
  matcher.save();
  ratings.save();
  writeFileSync("out/programme.json", JSON.stringify(programme));
  const text = programmeReport(programme, report, today);
  writeFileSync("out/report.txt", text);
  console.log(text);
  console.log(`\nprogramme → scraper/out/programme.json (${(JSON.stringify(programme).length / 1024).toFixed(0)} KB), OMDb calls: ${ratings.calls}`);
  // Source failures don't fail the run: they're recorded in programme.sources (CI opens an issue on repeats, Phase 6).
  if (kv) {
    await publish(kv, programme);
    console.log("published → KV programme:v1");
  }
}

await main();
