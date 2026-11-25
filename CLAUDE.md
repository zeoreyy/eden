# eden — Lisbon cinema sessions

Mobile-first web app answering one question: **what's on in Lisbon, how good is it, when and where?**
Named after the Éden Teatro (Restauradores, 1937, Cassiano Branco), Lisbon's Art Deco cinema palace, nicknamed "Galo" for its cheap tickets.

## Read before doing anything
1. `docs/spec.md` — product rules. Settled; don't re-propose alternatives.
2. `docs/sources.md` — verified per-cinema data sources (audit of 24 Nov 2026). The source of truth for scrapers.
3. `docs/architecture.md` — stack, repo layout, data flow.
4. `docs/design.md` — visual direction + reference images in `design/references/`.
5. `docs/decisions.md` — why things are the way they are. Append new decisions there.

## Hard rules
- **Zero cost.** Free tiers only: GitHub Actions, Cloudflare Workers + KV, OMDb free key, TMDB free key. No paid APIs, no paid hosting, no custom domain (use `*.workers.dev`).
- **No AI/LLM anywhere in the running pipeline.** Deterministic scrapers only.
- **Sources = official cinema websites and their own booking systems.** No Instagram, Google Maps, aggregators, or Letterboxd scraping (Letterboxd ToS forbids it).
- **Never reuse auth tokens scraped out of a site's page** to call its private API directly. For UCI, use a real headless browser that loads the public page like a visitor (see sources.md).
- **Never invent URLs.** Link to the most specific official URL that exists: session > film > venue.
- **Never hide a cinema silently.** If a source fails, keep last good data and show "updated X ago".
- **Clean UI.** Only: poster, title (PT + original), year, runtime, IMDb rating, sessions (time · cinema · room), session link, one short label (cycle/festival/format). Nothing else.
- Be polite to sources: ≤ 3 runs/day, spaced requests, honest User-Agent (`eden-lisboa/1.0 (+repo URL)`).

## How to work with the user (José)
- Plan step by step, stop at each phase checkpoint and show real output before moving on.
- Direct and concise. No filler, no over-engineering. Simple beats clever.
- Don't create accounts or API keys — ask José to do it and tell him exactly where to click.
- Verify against live sites; if reality differs from `docs/sources.md`, update the doc and tell José.

## Commands
Run from the repo root (npm workspaces: `packages/shared`, `scraper`, `web`, `worker`). Node ≥ 22.
- Install: `npm install`
- Restore agent skills (gitignored, pinned in `skills-lock.json`): `npx skills experimental_install`
- Typecheck all: `npm run typecheck`
- Tests (vitest, against `scraper/fixtures/`): `npm test` · one file: `npm test -w scraper -- nos`
- Scrape locally, no publish (writes `scraper/out/programme.json`): `npm run scrape:dry`
  - one source: `npm run scrape:dry -- --only nos` (others keep their previous data)
  - rebuild from the last run's raw files, no requests to cinemas: `npm run scrape:dry -- --reuse` (still calls TMDB/OMDb for new films)
  - output: `scraper/out/programme.json` + human report `scraper/out/report.txt`
- Scrape + publish to KV (needs env secrets): `npm run scrape`
- Web dev server: `npm run dev` → http://localhost:5173 (proxies `/api` to the live Worker)
- Phone screenshots of every screen (390 px @2x → `design/app-shots/`): `npx tsx scripts/shoot-app.ts [url]` from `scraper/`; accessibility scan: `npx tsx scripts/a11y.ts [url]`; offline check: `npx tsx scripts/offline-check.ts`; app icons from `web/public/icon.svg`: `npx tsx scripts/make-icons.ts`
- Build web: `npm run build`
- Deploy Worker + assets: `npm run deploy` → https://eden.zeorey.workers.dev (locally uses `wrangler login`; CI uses `CLOUDFLARE_API_TOKEN`)
- Worker locally: `npm run dev -w worker` → http://127.0.0.1:8799 (8787 is used by another project); seed local KV with `npx wrangler kv key put --local --binding PROGRAMME programme:v1 --path ../scraper/out/programme.json` from `worker/`

Secrets locally go in `.env` (gitignored; template in `.env.example`), in CI as GitHub Actions secrets.

Skills: don't use `design-taste-frontend` (marketing-site kit with random palette "dealing" and stock photos; conflicts with docs/design.md).
