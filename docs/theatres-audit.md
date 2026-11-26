# Lisbon theatres — feasibility audit (26 Nov 2026)

Question (José): is adding theatre plays to eden worth it? Same problem as arthouse cinema — scattered across many small official sites — so maybe yes.
Method: the same rules as the cinemas (official sites + their own booking systems, honest `eden-lisboa/1.0` bot, robots.txt checked, ~2–4 requests per site, 1.2 s apart). No aggregators.

## What the sites look like

| Theatre | Site | robots.txt | Programme data | Booking |
|---|---|---|---|---|
| Teatro Nacional D. Maria II | tndm.pt | allows | `/programacao`: server-rendered runs (`26 NOV – 13 DEZ 2026 · Espetáculo · A Cantora Careca · encenação Beatriz Batarda · Sala Estúdio`). Also lists guided tours and **touring dates outside Lisbon** (must filter) | BOL (`tndm.bol.pt`) |
| São Luiz Teatro Municipal | teatrosaoluiz.pt | allows | `/programacao/`: runs + category (teatro / música / oficina). Show page: `11 a 20 dezembro · quarta a sábado, 19h30; domingo, 16h · Sala Mário Viegas · 1h30` (+ separate school sessions to exclude) | own box office (link per show to verify) |
| Teatro da Trindade INATEL | teatrotrindade.inatel.pt | allows | runs on home (`19 Nov 2026 – 10 Jan 2027 · SOB PRESSÃO`). Show page: `30 ABR a 20 DEZ · Qua a Sáb 21:00 · Dom 16:30 · 105 min · Sala Carmen Dolores` | **Ticketline event per show** |
| Artistas Unidos (Teatro da Politécnica) | artistasunidos.pt | allows | `/programacao-3/`: `3ª e 4ª às 19h30 · 5ª e 6ª às 21h00 · Sáb. às 16h00 e às 21h00` | BOL (`artistasunidos.bol.pt`) |
| Teatro Maria Matos | teatromariamatos.pt | allows | `/tipo/programacao/`: dates + times | Ticketline (many links) |
| Teatro da Comuna | comunateatropesquisa.pt | allows | WordPress; dates + many times on pages | to verify |
| Teatro Meridional | teatromeridional.pt | allows | dates + times on home; `/espetaculos/` 404 (other path) | BOL |
| Teatro do Bairro | teatrodobairro.org | no robots.txt | dates + times on home | BOL |
| Teatro Tivoli BBVA | teatrotivolibbva.pt | allows | mostly concerts/comedy/musicals | Ticketline |
| CCB | ccb.pt | allows | **iCal feed** (`/eventos/?ical=1`) — but mostly exhibitions, school activities; theatre is a small share | own/BOL |
| Culturgest | culturgest.pt | allows | `/programacao/por-evento/` renders no dates server-side (needs a closer look) | to verify |
| Teatro Aberto | teatroaberto.com | allows | programme page not found on first pass | to verify |
| Teatro do Bairro Alto (TBA) | teatrodobairroalto.pt | allows | **redirects to itself** (302 loop) for scripts — to verify | — |
| Teatro Variedades | teatrovariedades.pt | — | **expired TLS certificate** | — |
| Politeama | (domain guessed wrong) | — | to find | — |
| A Barraca | abarraca.com | no rules | no dates on home | to verify |

## What this means

1. **Theatres publish runs, not sessions.** A production runs for weeks (`19 Nov – 10 Jan`) with a weekly pattern written as free text (`Qua a Sáb 21:00 · Dom 16:30`, `quarta a sábado, 19h30; domingo, 16h`, `3ª e 4ª às 19h30`). Exceptions (no show on 24/25 Dec, extra matinées, school-only dates) are often not stated.
2. **Booking links exist** (Ticketline / BOL, official sales channels the theatres use) but usually **per production, not per performance**.
3. **No ratings.** IMDb/TMDB don't cover plays. Cards would be: image, title, author/director, theatre, run dates, weekly times, one label (teatro / dança / musical), booking link.
4. **The sites are similar to the arthouse ones**: small, server-rendered, mostly WordPress, bespoke per theatre (~1–2 h each for parser + fixtures + tests), with a handful needing extra checks.

## Two ways to do it

- **A. "Em cena" (recommended).** List productions on now / this week: title, theatre, `26 nov – 13 dez`, `qua–sáb 21h · dom 16h30`, booking link. Honest to how theatres publish; no invented performances; robust when the weekly text varies.
- **B. Per-session, like the cinemas.** Expand runs × weekly pattern into individual sessions. Fits the existing UI, but turning free text into dates risks **showing performances that don't exist** (holidays, cancelled days) — the one thing eden must not do.

## Verdict

Worth it as **option A with ~8 theatres first** (D. Maria II, São Luiz, Trindade, Artistas Unidos, Maria Matos, Comuna, Meridional, Teatro do Bairro), then Teatro Aberto / Culturgest / TBA after a closer look. Roughly the size of the arthouse part of Phase 1 + a small UI section. It needs José's decisions first: spec change (eden is "exactly 19 cinemas"), where it lives in the app (a 4th tab "Teatro"?), and that plays have no rating.
