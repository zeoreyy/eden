// Why didn't a film match? `npx tsx scripts/match-debug.ts "fatherland" "heart of the beast"` (uses out/raw-*.json + .env)
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { cachedApi, matchInput, tierOf, tmdbClient, verify } from "../src/match.ts";
import { JsonCache } from "../src/cache.ts";
import { groupFilms } from "../src/normalize.ts";
import { normTitle } from "../src/titles.ts";
import type { RawSession } from "../src/types.ts";
import { lisbonToday } from "../src/util.ts";

process.loadEnvFile(new URL("../../.env", import.meta.url));
const raws: RawSession[] = readdirSync("out").filter((f) => /^raw-.*\.json$/.test(f))
  .flatMap((f) => JSON.parse(readFileSync(`out/${f}`, "utf8")).sessions ?? []);
const api = cachedApi(tmdbClient(process.env.TMDB_API_KEY!), JsonCache.open("tmdb-films"));
const today = lisbonToday();
for (const want of process.argv.slice(2).map(normTitle)) {
  const g = groupFilms(raws).find((x) => [...x.keys].some((k) => k.includes(want)));
  if (!g) { console.log(`✗ no group for ${want}`); continue; }
  const input = matchInput(g);
  console.log(`\n■ ${input.queries.join(" / ")}  year=${input.year} rt=${input.runtime} dir=${input.directors.join("; ")}`);
  for (const q of input.queries.slice(0, 2)) {
    for (const y of input.year ? [input.year, undefined] : [undefined]) {
      for (const h of (await api.search(q, y)).slice(0, 6)) {
        const tier = tierOf(h, input);
        const d = tier ? await api.details(h.id) : undefined;
        console.log(`  [${q}${y ? ` ${y}` : ""}] ${h.id} ${h.title} / ${h.originalTitle} (${h.releaseDate ?? "?"}) tier=${tier ?? "-"}` +
          (d ? ` → ${d.year} ${d.runtime}m ${d.directors.join(", ")} verify=${verify(input, d, tier!, today)}` : ""));
      }
    }
  }
}
void existsSync;
