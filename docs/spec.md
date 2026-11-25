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

## Tabs (exactly four)
| PT | EN | Content |
|---|---|---|
| Hoje | Today | Every film showing today across all 19 cinemas |
| Semana | Week | Same, rolling 7 days from today, with a day selector |
| Comercial | Commercial | List of commercial cinemas → tap one → its day as a chronological timeline, day selector |
| Autor | Arthouse | Same for the 5 arthouse cinemas; cycle labels matter most here |

No other tabs, no "next hour" view, no extra filters.

## Movie card
Poster · title · original title (if different) · year · runtime · IMDb rating · next session times as small chips.
Arthouse sessions get a small "Autor" badge in Hoje/Semana.
Tap card → film sheet with all sessions grouped by day → cinema → time chips. Small link "Ver no Letterboxd" (plain link to the film page/search, no rating).

## Session chip
Time · cinema short name · room/format when known · one short label (cycle, festival, IMAX, 4DX, VIP…). Tapping opens the official URL (session > film > venue). Never invent URLs.

## Ordering
- **All sessions are shown, any time of day** (arthouse morning sessions included). Ordering never hides anything.
- Hoje/Semana: **Top picks first**, then everything else by next session time.
- Top picks = commercial films only. Primary signal: the chains' own featured lists (NOS `getTopMovies` — verify it in Phase 1). Fallback/complement: films showing in the most distinct commercial cinemas between 18:00–23:00 that day (minimum 3 cinemas, max 6 picks). Arthouse is never ranked.
- Past sessions hidden on Hoje. Sessions after midnight (e.g. 00:30) belong to the previous evening.

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
