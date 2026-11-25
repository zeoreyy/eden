# eden

**What's on in Lisbon's cinemas, how good it is, when and where.**
→ **https://eden.zeorey.workers.dev** (installable on your phone: *Share → Add to Home Screen*)

Named after the Éden Teatro (Restauradores, 1937, Cassiano Branco), Lisbon's Art Deco cinema palace.

- **19 cinemas**: Cinemas NOS (8), UCI (2), Cinema City (4), and the arthouse *salas de autor*: Cinemateca, São Jorge, Nimas, Ideal, Fernando Lopes.
- **Hoje / Semana / Comercial / Autor**, film sheet with every session, IMDb rating, PT/EN, works offline.
- Every session links to the cinema's own booking page (session › film › venue — never invented).

## How it works

```
GitHub Actions (07:00 · 13:00 · 19:00 UTC)
  scraper → official cinema sites only → TMDB (match) → OMDb (IMDb rating) → Cloudflare KV
Cloudflare Worker → the web app + GET /api/programme
```

- **Sources:** each cinema's official site or booking system (see [docs/sources.md](docs/sources.md)). No aggregators, no AI in the pipeline.
- **Never hides a cinema:** if a source fails, the app keeps its last good data and says how old it is; after 2 failed runs in a row an issue opens here by itself.
- **Cost: €0** — GitHub Actions, Cloudflare Workers + KV free plans, free TMDB and OMDb keys.

Docs: [spec](docs/spec.md) · [sources](docs/sources.md) · [architecture](docs/architecture.md) · [design](docs/design.md) · [decisions](docs/decisions.md)

## Run it

Node ≥ 22. Secrets go in `.env` (template: `.env.example`).

```bash
npm install
npm test                 # vitest, against saved fixtures
npm run scrape:dry       # scrape everything → scraper/out/programme.json + report.txt
npm run dev              # web app on :5173, reading the live API
npm run deploy           # build + deploy the Worker
```

## Known limitations

- **UCI (El Corte Inglés, UBBO):** shown with a link to UCI's site and no times yet. UCI's pages show a Cloudflare check to home connections but load from GitHub Actions; the parser is being written against what that page shows (no token reuse, no bot evasion).
- **Rotten Tomatoes:** not shown — OMDb no longer provides it (decision #24). IMDb only.
- **Next week's commercial programme** appears on Thursday (NOS/UCI publish through Wednesday); the Semana tab says so.
- **Cinemateca** publishes month by month, so early in a month the later days are empty until they post them.
- **Ratings need a TMDB match.** Matching is deliberately strict; festival sessions, short-film programmes and live events (opera, concerts) stay unmatched and show no rating — fixes go in `data/overrides.json`.
- **Scrape times shift with daylight saving** (GitHub cron is UTC): ~07:17/13:17/19:17 in winter, an hour later in summer. GitHub may delay scheduled runs.
- Dark mode only for now; the cream light mode in the design brief isn't built.

## Credits

Film data from [TMDB](https://www.themoviedb.org/) (this product uses the TMDB API but is not endorsed or certified by TMDB) and ratings via [OMDb](https://www.omdbapi.com/). Session times and links © the cinemas. Fonts: Limelight and Jost (SIL Open Font License). Facade, sala and emblem artwork are original drawings.
