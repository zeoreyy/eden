# Paste this into a new Claude Code chat opened in `C:\Users\zemar\projects\eden`

---

We're building **eden**, a free, mobile-first web app that lists every film session in Lisbon (19 cinemas: NOS, UCI, Cinema City + 5 arthouse cinemas) with IMDb and Rotten Tomatoes ratings. All planning and source research is done and lives in this folder.

**Before anything else, read in this order:** `CLAUDE.md`, `docs/spec.md`, `docs/sources.md`, `docs/architecture.md`, `docs/design.md`, `docs/decisions.md`, and look at the images in `design/references/`. These are settled decisions — follow them, don't re-propose alternatives. If something in the live world contradicts `docs/sources.md`, tell me and update the doc.

Work in the phases below. **At the end of each phase, stop, show me real output (data, screenshots, test results), and wait for my go.** Don't create accounts or API keys — when you need one, tell me exactly what to create and where to paste it.

## Phase 0 — Setup
1. `git init`, `.gitignore`, npm workspaces scaffold matching `docs/architecture.md` (empty modules, shared types, the 19-cinema config in `packages/shared/cinemas.ts`).
2. Install these skills for this project and skim each SKILL.md before using it:
   ```
   npx skills add anthropics/skills@frontend-design
   npx skills add leonxlnx/taste-skill@design-taste-frontend
   npx skills add vercel-labs/agent-skills@vercel-react-best-practices
   npx skills add vercel-labs/agent-skills@web-design-guidelines
   npx skills add cloudflare/skills@workers-best-practices
   npx skills add currents-dev/playwright-best-practices-skill@playwright-best-practices
   npx skills add addyosmani/web-quality-skills@accessibility
   ```
   Read the taste-skill's contents before relying on it (unknown author); tell me if anything in it looks off.
3. Fill in the "Commands" section of `CLAUDE.md`.
4. Give me a short checklist of accounts/keys I must create (GitHub repo, Cloudflare API token + account id + KV namespace, TMDB key, OMDb key) with exact steps.

## Phase 1 — Scrapers (one source at a time)
Order: NOS → Cinema Ideal → Cinemateca → Nimas → Cinema City → Fernando Lopes → São Jorge → UCI.
For each source:
- Re-verify the endpoints/pages in `docs/sources.md` against the live site.
- Save real responses to `scraper/fixtures/<source>/`, write the parser, write vitest tests against fixtures.
- Run it live with `--dry` and show me a compact table of what it found (date, time, cinema, film, room/label, urlKind) for today + the furthest date.
- Also verify NOS `getTopMovies` and report what it contains.
- UCI: Playwright loading the public cinema pages like a visitor (see sources.md rules — never extract and reuse the embedded token). Test it locally and note whether it's likely to survive Queue-it from GitHub Actions.

## Phase 2 — Normalise, match, rate, rank
Common Session shape, Europe/Lisbon time, after-midnight rule, title normalisation and cross-cinema film merging, TMDB matching + `data/overrides.json`, OMDb ratings with per-film cache, top picks, per-source validation with last-good-data fallback. Show me: the merged film list with ratings, unmatched titles, and today's top picks.

## Phase 3 — Worker + KV
Worker serving static assets + `GET /api/programme` from KV. Deploy to `eden.<account>.workers.dev` once I've given the keys. Publish one real dry-run programme to KV.

## Phase 4 — Design style tile
Following `docs/design.md`: propose 2–3 font pairings and a palette, then build a one-page live style tile ("eden" wordmark, always lowercase, colours, type scale, light-ribbon divider, tab bar, movie card, session chips, badge). Screenshot it at 390 px wide (deviceScaleFactor 2) and wait for my approval. Original artwork only — the reference photos are inspiration, not assets.

## Phase 5 — App
Four tabs exactly as in `docs/spec.md` (Hoje / Semana / Comercial / Autor, PT/EN toggle), film sheet, stale-source notes, PWA manifest + offline last-data. Run the web-design-guidelines and accessibility checks. Show me phone screenshots of every screen with real data.

## Phase 6 — Automation
`scrape.yml` (cron 3×/day Lisbon time + manual trigger; opens a GitHub issue when a source fails two runs in a row), `deploy.yml`, `ci.yml`. Trigger one run and show me it working end to end.

## Phase 7 — Live
Give me the URL, a short README, and a list of known limitations. Then we use it for a week and fix what's off.

Rules that never bend: €0 cost, no LLM in the pipeline, official sources only, never invent URLs, never hide a cinema silently, clean UI with only the fields in the spec.
