# eden — Product spec (settled)

## The question it answers
"What movies are on in Lisbon, how good are they, and when and where are the sessions?"
Core moment: it's 18:00, José opens the app on his phone and picks a film for tonight.

## Users
Movie-goers in Lisbon — cinephiles and casual viewers, Portuguese and foreigners.

## Language
- Portuguese by default, **PT/EN toggle in v1** (simple dictionary, choice saved in localStorage).
- Film titles: as published by the cinema (usually PT), original title underneath when known.

## Cinemas (exactly these 19 — do not add others)
**Comercial**
- Cinemas NOS: Almada Forum, Amoreiras, CascaiShopping, Colombo, Forum Montijo, Odivelas Strada, Oeiras Parque, Vasco da Gama
- UCI: UCI El Corte Inglés, UCI LUXE UBBO
- Cinema City: Alegro Alfragide, Alegro Setúbal, Alvalade, Campo Pequeno

**Cinema de Autor** (EN: "Arthouse")
- Cinemateca Portuguesa, Cinema São Jorge, Cinema Medeia Nimas, Cinema Ideal, Cinema Fernando Lopes

Out of scope: Culturgest (almost no film screenings), Cinema City Beloura (not operating), NOS Torres Vedras (outside the AML), Cinema City Leiria, UCI Arrábida.

## Tabs (exactly three — Hoje merged into Semana, José 25 Nov 2026)
| PT | EN | Content |
|---|---|---|
| Semana | Week | Home. Rolling 7 days with a day selector, **today selected by default** (title "Hoje"); every film showing that day across all 19 cinemas |
| Comercial | Commercial | Toggle **Filmes \| Cinemas** (default Filmes). Filmes = Semana restricted to commercial cinemas (top picks first). Cinemas = list (centre-out; shows today's count or "próxima: qui 26") → tap one → that cinema's day as film cards, day selector |
| Autor | Arthouse | Same for the 5 arthouse cinemas (Filmes never ranked); cycle labels matter most here |

No other tabs, no "next hour" view.

## Search and filters (José, 27 Nov 2026)
One clean search field (PT or original title, accents ignored) above the day selector on Semana, on Comercial/Autor *Filmes* and on a cinema's page, plus three quiet pills set with an iPhone-style scroll wheel: **Depois das HH:MM** (session start), **Duração até Xh YY** (runtime) and **Zona** (Lisboa · Amadora e Odivelas · Oeiras e Cascais · Margem Sul; also on the *Cinemas* list). Search and filters follow you across days and tabs (they live in the URL). Days with results get a small dot; if the open day has none, a card points to the first day that has ("Ver seg 30 ›"). No other filters.

## Share, info, first visit
- **Share a session** from the film sheet (small share glyph on each time): "The Hunger Games · hoje 21:30 · Odivelas?" + a link `/s/<session>` whose preview shows the poster; opening it lands on that film with the session lit.
- **Info ("i")**: what eden is, how it works (replays the tour), share eden, send feedback (email), a line on the Éden and the "Galo". No "built by" line.
- **First visit**: a guided tour on the real app (lights up the day selector, search, a film, a time, the tabs, "i"), ending with add-to-home steps for that exact phone/browser. Once per device.

## Movie card
Poster · title · original title (if different) · year · runtime · IMDb rating · next session times as small chips.
Arthouse sessions get a small "Autor" badge in Hoje/Semana.
Tap card → film sheet with all sessions grouped by day → cinema → time chips, plus **links out to read about the film**: IMDb, Letterboxd, TMDB (synopsis, cast, director, trailer live there) and the cinema's own film page. The app itself still shows no synopsis/cast.

## Session chip
Time · cinema short name · room/format when known · one short label (cycle, festival, IMAX, 4DX, VIP…). Tapping opens the official URL (session > film > venue). Never invent URLs.

## Ordering
- **All sessions are shown, any time of day** (arthouse morning sessions included). Ordering never hides anything.
- Hoje/Semana: **Top picks first**, then everything else by next session time.
- Top picks = commercial films only. Primary signal: the chains' own featured lists (NOS `getTopMovies` — verify it in Phase 1). Fallback/complement: films showing in the most distinct commercial cinemas between 18:00–23:00 that day (minimum 3 cinemas, max 6 picks). Arthouse is never ranked.
- Past sessions hidden on today. Sessions after midnight (e.g. 00:30) belong to the previous evening.

## Ratings
- IMDb rating via OMDb (free key, 1,000/day), cached per film.
- Rotten Tomatoes: not shown — OMDb no longer provides it (decision #24).
- Letterboxd rating: not shown (no legitimate free access). Link only.
- No composite scores, no weights, no invented ratings. Missing rating = simply not shown.

## Data freshness
- Scrape ≤ 3×/day. Each source tracked separately.
- If a source fails: keep last good data, show "atualizado há X dias" on that cinema. Never hide it.
- Semana note when relevant: "A programação comercial da próxima semana sai à quinta-feira." (NOS/UCI publish until Wednesday.)

## Never show
Synopses, prices, subtitle/dub info, neighbourhoods, editorial notes, "need to know" sections.
