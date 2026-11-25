# Data sources — verified 24 Nov 2026 (audit + Phase 1 re-verification)

Each source was inspected live (curl + Chrome DevTools network tab), then re-verified while writing its scraper (Phase 1, same day). "Phase 1 re-verification" notes below win over the audit text above them.

Legend for `urlKind`: **session** (deep link to that screening), **film**, **venue**.

---

## 1. Cinemas NOS — JSON, easy
Site: Adobe AEM, JS-rendered; data behind it is public JSON (no auth, no cookies, Cloudflare-cached `max-age=300`).

| Purpose | Endpoint (prefix `https://www.cinemas.nos.pt`) |
|---|---|
| Theaters | `/graphql/execute.json/cinemas/getAllTheatersWithoutRegion` → uuid, name, regionuuid, address, location, rooms |
| Regions | `/graphql/execute.json/cinemas/getAllRegions` (Grande Lisboa = `f989907b-97ae-4ab7-a8a8-b6c22cc8584d`; includes Torres Vedras → exclude) |
| Films in theaters | `/graphql/execute.json/cinemas/getMoviesInTheaters` → uuid, title, originaltitle, duration (min), director, releasedate, format, version, portraitimages.path, `aggregateformatnumber` |
| **Top movies (verify!)** | `/graphql/execute.json/cinemas/getTopMovies` — NOS's own featured list; candidate primary "Top picks" signal |
| Films by theater | `/graphql/execute.json/cinemas/getMoviesbyTheaterID;theaterID=<uuid>` |
| **Sessions** | `/bin/cinemas/render/getMovieSessions.getMovieSessionsAggregator.json?aggregateMovieId=<aggregateformatnumber>` |

Sessions response: `days[] → {name: "Hoje"/"Amanhã"/…, theaters[] → {name, theaterId, regionId, sessions[] → {uuid, time "HH:MM", type, description (room e.g. "Sala 4DX","IMAX","VIP 1"), operationalDate "2026-11-24Z", format (2d/3d/imax/4dx/atmos/screenx atmos/xvision atmos/xl vision atmos), version (VO/Dob)}}}`. One call per film returns ALL NOS cinemas nationwide → filter by our 8 theaterIds.

- Ticket URL (**session**): `https://bilheteira.cinemas.nos.pt/Cinemas/Ticket?SessionUUID=<session uuid>` (verified 200).
- Same film in several formats shares `aggregateformatnumber`; film titles carry suffixes like "(IMAX)", "(ATMOS)", "(VP 3D)" → strip for display, use format as label.
- Quirks: the **sessions** endpoint body is **Latin-1** (the graphql endpoints are UTF-8). Sessions like 00:30 carry the previous `operationalDate` → belong to previous evening.
- Missing: **production year** (only releasedate). Year comes from TMDB match.
- Horizon: until the next Wednesday, plus pre-sales and event cinema (Royal Ballet etc.) months ahead.

**Phase 1 re-verification (24 Nov 2026):**
- Film list: use `getMoviesbyTheaterID` for each of the 8 theaters (union). `getMoviesInTheaters` misses pre-sales and events (e.g. "As Novas Desventuras de Cliff Booth (IMAX)", K-pop concerts) that have sessions.
- On Tuesday 24 Nov the full programme ran to Wed 2 Dec (9 days), not "today+tomorrow".
- Movie objects have `detailurl` → film page `https://www.cinemas.nos.pt/filmes/<slug>.html`.
- NOS has **no per-cinema page** (cinemas are a modal on `/cinemas`) → venue URL for all 8 is `https://www.cinemas.nos.pt/cinemas`.
- Title suffixes have typos: "Vingadores - Doomsday (3D INIFNITY)".
- **`getTopMovies`**: 29 items with an editorial `position` (1–38, gaps) and `moviestate` ∈ InTheaters / Premiere / PreSale. It is NOS's homepage carousel order, national (no per-cinema data), and includes kids' dubbed versions (VP) and pre-sales weeks away. Usable as a ranking signal only after filtering to films with evening sessions today in our cinemas.

Theater IDs (AML):
```
cf8fe24f-5589-40b8-acac-f2b230c63598  Cinemas NOS Almada Forum
ea2970b2-8c00-4bd5-8716-586269b2f98f  Cinemas NOS Amoreiras
54b58378-917a-45b3-ab7b-890ae6b567cb  Cinemas NOS CascaiShopping
e0ea3044-4a1b-46b1-bca2-69fd8eae16d7  Cinemas NOS Colombo
433306d2-1f37-4f72-a6eb-83bdb389feb8  Cinemas NOS Forum Montijo
dcd7d577-ad37-4382-b750-f44940a75b1a  Cinemas NOS Odivelas Strada
9ac5a984-6792-4cec-870c-5e6beaba6d69  Cinemas NOS Oeiras Parque
4686b0dd-f485-40a6-afcb-5babdcfc467b  Cinemas NOS Vasco da Gama
```

---

## 2. UCI — headless browser, medium
Official directory (`/cinemas/`): Arrábida 20 (Porto), **UBBO** ("UCI LUXE na Amadora"), **El Corte Inglés** (Lisboa). Site works in Chrome without login; Queue-it waiting room in front.

How the page gets data: browser calls Vista OCAPI `https://vwc.ucicinemas.pt/WSVistaWebClient/ocapi/v1/showtimes/by-business-date/<YYYY-MM-DD|first>?siteIds=077` with a **guest bearer token embedded in the page**.

**Rule: do NOT extract that token and call the API from a script** (flagged as unauthorized access during the audit). Instead: Playwright (in GitHub Actions) loads the public cinema page like a normal visitor, clicks each date, and either reads the rendered DOM or listens to the page's own network responses (`page.on('response')`).

- Pages: `https://www.ucicinemas.pt/cinemas/el-corte-ingles/` (siteId `077`), `https://www.ucicinemas.pt/cinemas/ubbo/` (verify slug + siteId).
- Rendered per film: title, runtime ("2h 54m"), sessions as links with time + room ("Sala 14"). Film page `/filmes/<slug>/<HO000xxxxx>/`.
- Ticket URL (**session**): `https://www.ucicinemas.pt/compra/lugares/?showtimeId=077-72679` (from the session `<a href>`).
- Horizon: full programme until Wednesday; later dates only show pre-sales.
- Risk: Queue-it may challenge GitHub's datacenter IPs. If blocked: keep last good data, mark stale, and show UCI cinemas with a venue link. Do not try to evade bot protection.

**Phase 1 re-verification (24 Nov 2026) — BLOCKED:**
- `curl` (honest UA) → 302 to `uciportugal.queue-it.net` for both cinema pages.
- Playwright headless Chromium with an honest UA (`HeadlessChrome/… eden-lisboa/1.0 …`), from a residential IP → 403 + **Cloudflare Turnstile** "Executando verificação de segurança / Confirme que é humano". Never reaches the programme. From GitHub Actions it will be the same or worse.
- We do not solve/evade the challenge (no stealth plugins, no UA spoofing, no headed-browser tricks). `scraper/src/sources/uci.ts` detects the wall and fails the source cleanly → UCI cinemas show a venue link + "horários no site da UCI".
- UBBO slug `/cinemas/ubbo/` and its siteId are still **unverified** (page unreachable to us).

**Update 25 Nov 2026 — reachable from GitHub Actions:** the same honest headless visit, from the Actions runner, loads both cinema pages with no challenge (first CI run, 2.7 s; no Turnstile, no Queue-it). My earlier guess ("same or worse") was wrong. The scraper now logs status, final URL, title and visible text (never raw HTML — it embeds UCI's API token; CI logs are public). Next: write the parser against that visible content, as a normal visitor's page. Still no token reuse.

---

## 3. Cinema City — site AJAX, easy-medium
Homepage selector IDs: Alegro Alfragide `3183`, Alegro Setubal `6300511`, Alvalade `96`, Campo Pequeno `2669` (Leiria `14361` — exclude). Beloura is gone from selectors (only a dead booking subdomain remains).

Endpoint: `https://www.cinemacity.pt/ajaxHandler.ud121` (GET, returns `{"status":true,"htmlresponse":"<option…>"}`):
- dates for a cinema: `trigger_pre_event_0=quick_movie_session_menu&field_id=date&cinema=<id>&has_vip=0`
- films for cinema+date: `…quick_movie_session_menu&field_id=movie&cinema=<id>&date=YYYY-MM-DD&has_vip=0`
- times: `trigger_pre_event_0=quick_movie_session&field_id=time&cinema=<id>&movie=<movieId>&date=YYYY-MM-DD` → `<option value="119208" cinema="CCALVALADE">19:20</option>`
- VIP rooms via `has_vip=1` / `room` param (verify).
- Film list + IDs also in homepage `<select>`; film pages `https://www.cinemacity.pt/movie/<slug>/` have runtime + director.

Cinema codes → booking subdomains:
```
CCALEGRO   → alfragide.admit-one.eu
CCSETUBAL  → setubal.admit-one.eu
CCALVALADE → alvalade.admit-one.eu
CCCAMPOPEQ → campo.admit-one.eu
```
- Ticket URL (**session**): `https://<sub>.admit-one.eu/?p=tickets&perfCode=<value>` → redirects to `/seats/<id>/` (verified).
- Film names are uppercase, sometimes inverted ("CHRISTOPHERS, OS"), with "VO"/"VP"/"PAID PREVIEW" suffixes → normalise.
- Missing: original title, year, room. Horizon ≈ 9 days (to next Wednesday) + scattered pre-sale dates.

**Phase 1 re-verification (24 Nov 2026):**
- `has_vip=0` now returns **nothing** (dates) or a partial list (films). Use **`has_vip=` (empty)** — it returns everything; `has_vip=1` is identical.
- Best call: `trigger_pre_event_0=quick_movie_session_menu&field_id=movie&cinema=<id>&date=YYYY-MM-DD&has_vip=` returns the **whole day timeline** for that cinema: `<li class="movie">` with time, title, booking link (`showwarning('http://<sub>.admit-one.eu/?p=tickets&perfCode=<n>')`) and a room badge ("NORMAL + BIG" → Sala BIG). One call per cinema per date (~70 calls/run). No movie ids or per-film calls needed.
- Booking links are served as `http://`; `https://` works (302 → `/seats/<id>/`).
- Venue pages: `https://www.cinemacity.pt/editorial/cinema-city-<alegro-alfragide|alegro-setubal|alvalade|campo-pequeno>/` (200).

---

## 4. Cinemateca Portuguesa — HTML, easy (best arthouse source)
`https://www.cinemateca.pt/Programacao.aspx?date=YYYY-MM-DD` — server-rendered ASP.NET, no API needed.
Per session: `DD/MM/YYYY, HHhMM | Sala <name>`, **Ciclo** (per session), ORIGINAL TITLE (caps), Portuguese title, director, `Country, Year - NN min`.
- Detail link: `?id=<sessionId>&date=YYYY-MM-DD`.
- Ticket URL (**session**): `https://cinemateca.bol.pt/Comprar/Bilhetes/<id>-<slug>/`.
- Some sessions bundle several shorts ("Os Mestres do Riso | THE ADVENTURER | …") → one programme item, rating only if single film.
- Horizon: monthly — next month appears near month end (on 24 Nov, December was empty). Closed Sundays.
- Duplicated blocks in HTML (list + detail) → dedupe by session id.
- Re-verified 24 Nov 2026: the day page's right-hand detail column repeats **every** session of the day with its BOL ticket link → session URLs without extra requests (pair by the "DD/MM/YYYY, HHhMM | Sala …" line; each detail block also has a second `infoDate` div holding the cycle). Rooms: "Sala M. Félix Ribeiro", "Sala Luís de Pina". Walk day by day until 3 empty days past month end (Sundays are empty).

---

## 5. Cinema São Jorge — WordPress, medium
- Event index: `https://cinemasaojorge.pt/wp-json/wp/v2/evento?per_page=100` (public). Category taxonomy `/wp-json/wp/v2/categoria-de-evento`: keep `Cinema`(154), `Filme`(134), `Sessão de festival`(18), `Sessão Especial`(19), `Mostra de cinema`(153); drop concerts, stand-up, workshops, etc. **Session dates are NOT in the REST data** (acf empty).
- Event page `https://cinemasaojorge.pt/evento/<slug>/`: festival name, category, runtime (`154'`), "Sessões" block: `Quinta-feira, 26 de novembro` / `18:00` / `| Sala 2` (no year → infer nearest future date).
- Ticket URL (**session/event**): `https://www.bol.pt/Comprar/Bilhetes/<id>-<slug>`.
- Missing: original title, year. Mostly festival content; many titles won't match IMDb — fine.

**Phase 1 re-verification (24 Nov 2026) — different approach:**
- The REST index can't tell which events are upcoming (3,088 events; `date` = publish date) → not used.
- **`https://cinemasaojorge.pt/programacao/page/<N>/`** is server-rendered: 10 upcoming events per page in date order, each with `<time datetime="YYYY-MM-DD HH:MM:SS">` of its next session and the event link. Walk pages until past a 30-day horizon (~5 pages).
- Event page: `<li aria-label="Categoria do evento">`, festival tag above the `<h1>`, `<li aria-label="Duração">154'</li>`, a "Sessões" list with `<time datetime="YYYY-MM-DD">`, `<time datetime="HH:MM">`, `| Sala 2`, and one BOL "Comprar bilhetes" link per event (session link only when the event has one session).
- Not used: the site's own `admin-ajax.php?action=filter_evento` listing — it needs a nonce scraped from the page (token reuse).
- ~51 event pages per run (~45 s with spacing).

---

## 6. Cinema Medeia Nimas — HTML, easy
`https://medeiafilmes.com/cinemas/cinema-medeia-nimas` — server-rendered, one section per day (`data-sticky-slug="YYYY-MM-DD"`), ~23 days ahead.
Per session: time, title, director, release date, genre, runtime ("2h35"), rating age, link to film `https://medeiafilmes.com/filmes/<slug>-<year>` (**year is in the slug**), cycle link `https://medeiafilmes.com/ciclos/<slug>` when part of a cycle.
- Film pages: original title, year, runtime.
- Tickets: ActiveTicket only per film (`https://activeticket.pt/evento/<TITLE>/<id>`) or venue (`https://activeticket.pt/local/CinemaNimas/7`) → use **film** URL (Medeia film page) as link.
- Page is large (~1.8 MB) — fetch once per run.
- Re-verified 24 Nov 2026: 23 days ahead. Quirk: a film's schedule block has `id="<slug>"` only on its **first** appearance on the page; later ones are `<div  class="schedule-group…">`. Cycle label: `Ciclo "LEFFEST – Continuação"`. All "comprar bilhetes" buttons go to the venue (`activeticket.pt/local/CinemaNimas/7`).

---

## 7. Cinema Ideal — JSON, easy
**Official site is `cinemaidealemcasa.pt`** (cinemaideal.pt is dead: HTTPS 526, HTTP = cPanel placeholder).
- Sessions: `https://bilheteira.cinemaidealemcasa.pt/session/with-movies` — public JSON, no auth. Array of `{id, dateTime "2026-11-24T14:00:00" (Lisbon local), movieId, movie{id,title,imageUrl}, sessionState, isPrivate, ticketTypes[]}`. ~9 days ahead. Filter `isPrivate=false`.
- Ignore prices (`ticketTypes`) — never displayed.
- Link: **film** `https://bilheteira.cinemaidealemcasa.pt/?movieid=<movieId>`. Re-verified 24 Nov 2026: the booking app (Angular, "Midas") only reads `movieid` (and an internal `office` flag) from the query string → **no session deep link exists**. Venue URL: `https://www.cinemaidealemcasa.pt/`. `movie.imageUrl` is a poster on the official site.
- Missing: room (single screen anyway), year, runtime, original title (titles uppercase; sometimes the original, e.g. "WILD HORSE NINE").

---

## 8. Cinema Fernando Lopes — HTML (Cargo site), easy but fragile
- `https://cinemafernandolopes.pt/Programacao` — hand-typed list: `ter, 24 nov` / `19h00 -` / `TITLE` / optional `- Ciclo …` or `- sessão especial`. Inconsistent spacing/dashes → tolerant parser + fixtures.
- Film pages `https://cinemafernandolopes.pt/<SLUG>`: `2026 / M/12 / Drama / 82 MIN`, director, full session list (`qui, 26 nov | 19h30`) often further ahead than the programme page → use film pages as the main session source, programme page to discover slugs.
- Tickets: venue only `https://www.ticketline.pt/salas/sala/3287` → link to the **film** page.

**Phase 1 re-verification (24 Nov 2026):**
- Programme page: plain text, **no links**, ran to Wed 2 Dec. Quirks seen: `19h00- TRAINSPOTTING` (no space), labels `- Ciclo Cinema e Direito`, `- sessão especial`, titles with their own dashes ("NEW DYSTOPIAS - TWO PEOPLE …").
- Film slugs: homepage (current films + "coming soon" tiles whose pages **404**) and `/Filmes-1`, `/Sessoes-Especiais` (archive). Slugs don't always match the typed title ("PSICOPATA VITORIANA" → `/PSICOPATA-VICTORIANA`; long titles truncated) → fuzzy match; never link a page we didn't load.
- Film pages **do** have a per-film Ticketline event link on the "+ COMPRAR BILHETES" button (`https://www.ticketline.pt/pt/evento/<slug>-<id>`) → used as the chip link (film-level). Pages can also carry other events' Ticketline links — only take the button's. Session lines: `qui, 26 nov | 19h30` (weekday sometimes missing).
- Film pages didn't extend beyond the programme this week; the scraper still adds any later film-page sessions.

---

## Ratings & metadata
- **TMDB** (free API key, José creates it): search `/search/movie?query=…&language=pt-PT&year=…` → match Portuguese or original titles; gives `imdb_id` (via `/movie/{id}/external_ids`), original title, year, runtime, poster. Use as the matching layer and poster fallback.
- **OMDb** (free key, 1,000/day): `?i=<imdbId>` → `imdbRating`. (Re-verified 25 Nov 2026: `Ratings[]` no longer includes Rotten Tomatoes — only IMDb + Metacritic.)
- Cache per film (TMDB id) in KV; refresh ratings weekly. Manual fixes in `data/overrides.json`.
- **Letterboxd**: ToS forbids scraping; API invite-only → link only, no rating.
