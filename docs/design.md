# eden — Design direction

## The idea
Lisbon's golden age of cinema palaces — the **Éden Teatro** (Restauradores, 1937, Cassiano Branco), São Jorge, Capitólio — translated into a minimal, modern mobile app. Timeless, not retro-kitsch. It should feel like walking into a 1930s sala de cinema, then getting out of the way so the films and times are the focus.

Reference images in `design/references/` (local only — gitignored, not ours to publish):
- `eden-facade-historic.webp` — the Éden facade: stepped Art Deco towers, vertical fins, giant hand-painted film poster, "TEATRO / EDEN / CINEMA" lettering.
- `eden-facade-detail.webp` — the "EDEN · TEATRO ·" geometric lettering in cast metal on travertine; bas-relief panels.
- `sala-interior-balconies.webp` — a Lisbon cinema hall: curved vaulted ceiling, **parallel ribbons of light**, stacked balconies, symmetry, rows of seats.

## What to take from them
- **Light ribbons** — thin horizontal/vertical luminous lines (like the ceiling strips) as the main decorative device: tab indicator, section dividers, the active day in the date selector, a soft glow behind the header.
- **Curves** — the vaulted ceiling: gently curved top of the header/hero, rounded-arch shapes for the film sheet; no generic rounded-rectangle-everything.
- **Symmetry and rhythm** — rows of seats → grids of session chips with steady rhythm.
- **Geometric Deco lettering** for the wordmark "eden" (always all lowercase, including the first letter; never capitalised or all caps) and headings only (stepped, monoline, wide). Body text in a clean, highly legible sans.
- **Materials as colour**: travertine/cream, charcoal/near-black auditorium, warm brass/gold light. Dark mode first (it's a cinema), with a cream light mode.
- Optional quiet touches: a subtle film-grain/noise texture; the stepped-tower silhouette as the app icon; "Galo" (the Éden's nickname for cheap tickets) as a tiny easter egg (e.g. 404 page or about line).

## What to avoid
Generic SaaS look, purple gradients, glassmorphism everywhere, emoji, stock icons for everything, busy cards, ratings badges shouting in colour. Posters and times are the content; decoration is light and lines.

## Practical constraints
- Mobile-first (≈390 px), large tap targets (≥ 44 px), thumb-reachable bottom tab bar with the 4 tabs.
- Fast on 4G: one JSON fetch, lazy posters, no heavy fonts (≤ 2 font families, subset, `font-display: swap`).
- Accessible: WCAG AA contrast (gold-on-black needs checking), visible focus, reduced-motion respected.
- Fonts: free (Google Fonts / open licence). Shortlist and show José 2–3 pairings before committing.
- **Image rights:** reference photos are inspiration only. Anything shipped must be original artwork (SVG lines/shapes drawn by us) or verified public-domain/openly licensed (e.g. check Arquivo Municipal de Lisboa / Biblioteca de Arte Gulbenkian licences before using any historic photo).

## Approved direction (25 Nov 2026)
See decision #27 and the live tile `design/style-tile/index.html?p=a&a=pedra` (screens in `design/style-tile/shots/`). Tokens: sala `#1a1613`, balcão `#241f1a`, noite `#0e0c0c`, travertino `#ece1cf`, pó `#a89a84`, pedra `#d6a892`, luz `#fff1dc`. Fonts: Limelight + Jost (self-hosted, latin subset).

## Process
Before building screens: produce a one-page style tile (wordmark, colours, type, chip, card, tab bar, light-ribbon divider) as a live page, screenshot it at phone size, and get José's approval.
