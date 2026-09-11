# QA Round 3: Visual Polish & Guidelines

*Phase 10 · 2026-09-11 · validated with the `web-design-guidelines` skill (Vercel Web Interface Guidelines, fetched 2026-09-11)*

## Visual review

| Viewport | Paper edition | Night edition |
|---|---|---|
| 1440 × 900 | Masthead, ticker, 3/9 grid, sticky table header: correct | Checked: correct, accent `#FF8047` legible |
| 375 × 812 | Stacked; collapsed sections; full-screen drawer with chart, range bar, stats: correct | Contrast verified by token (same components) |

Typography: Instrument Serif display / Schibsted Grotesk UI / IBM Plex Mono data. No banned fonts.
Motion: staggered masthead/panel reveal, price-line draw-in, drawer slide, ticker. All disabled by `prefers-reduced-motion`.

## Guidelines findings

| Rule | Finding | Status |
|---|---|---|
| Autoplay motion > 5s needs a stop control | Ticker only paused on hover/focus | **Fixed**: visible Pause/Play button |
| `touch-action: manipulation` | Not set | **Fixed** on interactive elements |
| `text-wrap: balance` on headings | Not set | **Fixed** (`pretty` on body copy) |
| Heading anchors need `scroll-margin-top` | Results heading scrolled flush to the top | **Fixed** |
| Inputs need `name` / `autocomplete` | Filter inputs lacked both | **Fixed** (`autocomplete="off"`) |
| Placeholders end with "…" | "e.g. 10" | **Fixed** |
| Curly quotes | Straight quotes and apostrophes in copy | **Fixed** |
| `translate="no"` on code | Editor could be machine-translated | **Fixed** |
| `theme-color` matches background | Ignored the manual theme toggle | **Fixed** (synced in JS) |
| Drawer `overscroll-behavior: contain` | Present | Pass |
| `color-scheme` per theme | Present on `:root` | Pass |
| Native `<select>` explicit colours | Present | Pass |
| No `transition: all` | Properties listed | Pass |
| Icon buttons labelled; decorative SVG hidden | Present | Pass |
| `tabular-nums` on number columns | Present | Pass |
| Loading states end with "…" | Present | Pass |
| URL reflects state | `#q=` and `#stock=` | Pass |
| Title Case headings/buttons | Sentence case | **Won't fix**: brand voice (see QA_ROUND_2) |
| `Intl.NumberFormat` for numbers | `toFixed` for prices and percentages | **Won't fix**: fixed 2-dp US-dollar data table, intentionally locale-independent |
| Virtualise lists > 50 | 103 rows max | **Won't fix**: DOM cost is trivial at this size |

## Post-fix axe-core

Page (paper), page (night), drawer open: **0 violations** of any severity.
