# eden — Architecture

## Data flow
```
GitHub Actions (cron ~07:00, 13:00, 19:00 Lisbon)
  └─ scraper (Node + TypeScript, Playwright only for UCI)
       1. fetch each source  → raw sessions
       2. normalise          → common Session shape, Lisbon timezone, after-midnight rule
       3. match films        → TMDB (pt-PT + original title + year) → imdbId, year, runtime, poster
       4. ratings            → OMDb (cached per film, weekly refresh)
       5. top picks          → NOS getTopMovies + cross-cinema evening count
       6. validate           → per-source sanity checks; failing source keeps last good data
       7. publish            → Cloudflare KV, key "programme:v1" (REST API; previous value = last good data)
Cloudflare Worker (free plan, https://eden.zeorey.workers.dev)
  ├─ static assets: the built web app
  └─ GET /api/programme → JSON from KV (cache headers ~10 min)
Browser (mobile-first PWA)
  └─ fetch /api/programme once, everything else client-side
```
Why not scrape inside the Worker: free Workers have 10 ms CPU/request and no browser. GitHub Actions is free and runs Playwright.
Cost: GitHub Actions (public repo = unlimited; private = 2,000 free min/month, we use ~300–500), Workers free (100k req/day), KV free (1,000 writes/day; we use ~10). Total €0.

## Repo layout (npm workspaces, TypeScript everywhere)
```
eden/
├── CLAUDE.md
├── docs/                      spec, sources, architecture, design, decisions
├── design/references/         inspiration images (not shipped unless licensed)
├── packages/shared/           types.ts (Cinema, Film, Session, Programme), cinemas.ts (the 19 cinemas config)
├── scraper/
│   ├── src/sources/           nos.ts uci.ts cinemacity.ts cinemateca.ts saojorge.ts nimas.ts ideal.ts fernandolopes.ts
│   ├── src/normalize.ts
│   ├── src/match.ts           TMDB matching + overrides
│   ├── src/ratings.ts         OMDb + cache
│   ├── src/toppicks.ts
│   ├── src/validate.ts
│   ├── src/publish.ts         KV write via Cloudflare API
│   ├── src/run.ts             orchestrator; `--dry` writes to ./out/programme.json instead of KV
│   ├── fixtures/<source>/     saved real responses for tests
│   └── test/                  vitest, one test file per source + normalise/toppicks
├── web/                       Vite + React + TS + Tailwind; i18n pt/en; PWA manifest + service worker
├── worker/                    src/index.ts, wrangler.jsonc (assets → ../web/dist, KV binding PROGRAMME)
├── data/overrides.json        manual title → TMDB id fixes
└── .github/workflows/
    ├── ci.yml                 typecheck + tests on push
    ├── scrape.yml             cron + manual trigger; opens an issue if a source fails 2 runs in a row
    └── deploy.yml             build web + `wrangler deploy` on push to main
```

## Core types (sketch)
```ts
type CinemaKind = "commercial" | "arthouse";
interface Cinema { id: string; name: string; shortName: string; kind: CinemaKind; chain?: "NOS"|"UCI"|"CinemaCity"; url: string }
interface Film { key: string; title: string; originalTitle?: string; year?: number; runtimeMin?: number;
  posterUrl?: string; imdbId?: string; imdb?: number; letterboxdUrl?: string }
interface Session { id: string; filmKey: string; cinemaId: string; startsAt: string /* ISO, Europe/Lisbon */;
  programmeDate: string /* YYYY-MM-DD evening it belongs to */; room?: string; label?: string;
  url: string; urlKind: "session"|"film"|"venue" }
interface SourceStatus { cinemaIds: string[]; lastSuccess: string; lastAttempt: string; ok: boolean; note?: string }
interface Programme { generatedAt: string; films: Film[]; sessions: Session[]; topPicks: Record<string /*date*/, string[] /*filmKeys*/>; sources: Record<string, SourceStatus> }
```

## Film identity across cinemas
Same film appears as "Cavalo Selvagem Nove" (NOS), "CAVALO SELVAGEM NOVE" (Cinema City), "WILD HORSE NINE" (Ideal). Key = TMDB id when matched; otherwise normalised title (lowercase, no accents, no "(VO)/(IMAX)/VP" suffixes, "CHRISTOPHERS, OS" → "os christophers"). Merge unmatched into matched when normalised titles equal either PT or original title.

## Secrets (GitHub Actions secrets — José creates them)
`CLOUDFLARE_API_TOKEN` (Workers + KV edit), `CLOUDFLARE_ACCOUNT_ID`, `KV_NAMESPACE_ID`, `TMDB_API_KEY`, `OMDB_API_KEY`. Never in the browser, never committed.
