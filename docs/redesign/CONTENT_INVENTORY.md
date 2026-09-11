# Content Inventory

*Phase 2 · source: `index.html`, `js/app.js`, `README.md`, `data/stocks.json` (2026-09-11)*

The site is one page, so the "scrape" is the source itself.

## MUST REUSE

| Content | Where | Notes |
|---|---|---|
| Product name "SQL Stock Screener" | `<title>`, `<h1>` | Keep; it is also the repo/demo identity |
| Author credit "Built by Ustym Karashchenko" | footer | Keep; add GitHub link |
| Engine badge (live SQLite version) | header | Keep; it proves the claim |
| Data provenance badge (count · real prices · age) + stale warning after 7 days | header | Keep logic, restyle |
| 6 presets (Momentum leaders, Beaten down, Low volatility, Golden cross, Sector scorecard, Best risk-adjusted) and their SQL | `app.js` | Keep verbatim |
| Filter set: sector, min/max price, min 1y return, max volatility, above 200-day average, sort | `index.html` | Keep; all generate SQL |
| Schema: 14 columns in table `stocks` | `app.js seed()` | Keep; now also documented in the UI |
| Behaviour: SQLite error shown verbatim, previous results preserved | `app.js run()` | Keep |
| CSV export | `app.js` | Keep |
| Dataset: 103 stocks, 11 GICS sectors, Yahoo Finance v8 chart API | `data/stocks.json` | Keep; add `data/history.json` |

## CAN MODIFY / REPLACE

| Content | Current | Plan |
|---|---|---|
| Tagline | "Real SQL. Real market data. Running entirely in your browser." | Keep meaning, sharpen into a standfirst that says what you can *do* |
| SQL hint | "— edit it, it's a real database" | Replace with keyboard hint + link to column reference |
| `◧` logo glyph, 📊 favicon | text/emoji | Replace with SVG monogram |
| Empty state | "No rows matched. Loosen a filter or edit the SQL." | Keep tone, add a "reset filters" action |
| Meta description | 125 chars, accurate | Tighten, add OG/Twitter equivalents |

## Media

No images on the site. New assets to create: SVG favicon/monogram, 1200×630 social preview image.

## Forms

No submitted forms. All inputs are local filters; nothing leaves the browser.
