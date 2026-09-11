# SQL Stock Screener

Screen ~100 US large-caps by writing **real SQL** — executed by **SQLite compiled to
WebAssembly, running entirely in the browser**. There is no backend, no API key, and no
database server: the whole application is static files.

**[Live demo → karashchenkoustym.github.io/Updated-Stock-Screener](https://karashchenkoustym.github.io/Updated-Stock-Screener/)**

![Static site](https://img.shields.io/badge/hosting-static-blue)
![No backend](https://img.shields.io/badge/backend-none-green)
![SQLite WASM](https://img.shields.io/badge/SQLite-WebAssembly-orange)

---

## What you can do

- **Write any SQL** against a `stocks` table — filters and presets just write the query for you
- **Editor with highlighting and autocomplete** — `Ctrl+Space` suggests columns, `⌘/Ctrl+Enter` runs
- **Open any stock** for a 1-year price chart with 50/200-day moving averages, its 52-week range and key stats
- **Column reference** — every column explained in plain English, click to insert
- **Share a screen** — "Copy link" puts the query in the URL; `#stock=AAPL` deep-links the detail view
- **Query history** kept in your browser, CSV export, and a light *paper* / dark *night* edition

## Why it's built this way

The brief was: queryable with SQL, reachable at any moment, free to host.

Those three pull against each other. Free hosting tiers that run a database
(Supabase, Neon, free Spaces) **sleep when idle** — a visitor then waits through a cold
start, or hits an error. Free *static* hosting never sleeps but traditionally can't run
SQL.

Compiling SQLite to WebAssembly resolves the conflict: the database ships as a file, the
query engine runs in the visitor's browser, and the site is plain static assets. Nothing
can go down because there is no server component to fail. Queries execute in single-digit
milliseconds since there's no network round-trip.

The trade-off, stated plainly: **data is a snapshot, not a live feed.** A scheduled GitHub
Action refreshes it after each US market close, so it's at most one trading day old.

## Data

| | |
|---|---|
| Source | Yahoo Finance public chart API (no key required) |
| Universe | ~104 US large/mid-caps across all 11 GICS sectors |
| Metrics | `data/stocks.json` — one row per stock (~35 KB) |
| Price history | `data/history.json` — a year of daily closes on one shared date axis (~175 KB, loaded only when a stock is opened) |
| Refresh | GitHub Action, weekdays after the close |

Every metric is **computed from real observed closes** by `scripts/fetch_data.py` —
1-month/3-month/1-year returns, annualised volatility (stdev of daily returns × √252),
50- and 200-day moving averages, distance from the 52-week high, 30-day average volume.
Sector labels are a static map, since those don't change.

Regenerate manually at any time:

```bash
python3 scripts/fetch_data.py     # no dependencies beyond the standard library
```

## Running locally

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

A web server is required — `file://` won't work, because the browser blocks
`fetch()` of the dataset and the WASM binary from the filesystem.

## Deploying (free, always-on)

**GitHub Pages**

1. Push this folder to a repository.
2. Settings → Pages → Source: *Deploy from a branch* → `main` / `root`.
3. Done. Live at `https://karashchenkoustym.github.io/Updated-Stock-Screener/`.

**Hugging Face Spaces** — create a Space with SDK **Static**, push these files.
Static Spaces don't sleep. (Docker/Gradio Spaces *do* idle out — avoid those here.)

Both are free and serve static files indefinitely.

## Automatic data refresh

`.github/workflows/refresh-data.yml` re-runs the fetch script on GitHub's runners
every weekday at 22:30 UTC (after the US close), then commits the result — Pages
redeploys automatically. It can also be triggered on demand from the Actions tab.

The job **refuses to commit a thin or broken dataset**: it aborts if fewer than 80
symbols came back, if any symbol is missing a price, or if the price history doesn't
cover every symbol with at least 200 trading days. A bad upstream response leaves the
previous good data in place rather than publishing a broken screener.

## Layout

```
index.html                 markup, SEO metadata, column reference
css/style.css              design tokens (light + dark) and components — see DESIGN.md
js/app.js                  SQLite bootstrap, filters, results, drawer, share links, history
js/editor.js               SQL highlighting + autocomplete over a native <textarea>
js/chart.js                SVG price chart with moving averages
data/stocks.json           screening metrics (regenerated daily)
data/history.json          daily closes for the detail chart (regenerated daily)
scripts/fetch_data.py      fetches prices, derives metrics
vendor/sql-wasm.{js,wasm}  SQLite compiled to WebAssembly (vendored, not CDN)
fonts/                     Instrument Serif, Schibsted Grotesk, IBM Plex Mono (OFL, self-hosted)
DESIGN.md                  design system: palette with contrast ratios, type, components
docs/redesign/             audits, plan and QA notes from the redesign
.github/workflows/         scheduled data refresh
```

`sql.js` and the fonts are **committed rather than loaded from a CDN** deliberately: a CDN
outage would otherwise take the site down, which defeats the point.

## Things worth noticing in the code

- Rows are inserted through a **prepared statement inside a transaction** — ~104 inserts
  in a few milliseconds rather than one statement compile per row.
- Indexes on `sector` and `change_1y`, the two most commonly filtered columns.
- The filter panel **writes SQL into the editor** rather than hiding it, so the query is
  always visible and can be taken over by hand.
- Query errors are surfaced verbatim from SQLite and **previous results are preserved**,
  so a typo doesn't wipe your screen.
- The editor is a **transparent textarea over a highlighted `<pre>`**, so typing, undo,
  IME and screen readers stay native — no editor library.
- The chart is **a few hand-written SVG paths**; moving averages are computed over the full
  year before slicing, so the 1M view still shows a correct 200-day line.
- **Accessibility is tested, not assumed:** zero axe-core violations in both themes, every
  colour pair contrast-checked (see `docs/redesign/ACCESSIBILITY_AUDIT.md`), keyboard-operable
  drawer, tabs, autocomplete and chart.

## Author

Built by **Ustym Karashchenko** — [GitHub](https://github.com/KarashchenkoUstym)

## Licence

MIT. Fonts are licensed under the SIL Open Font License (see `fonts/`).
