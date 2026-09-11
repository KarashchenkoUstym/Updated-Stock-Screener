# Tools Research

*Phase 11a · 2026-09-11*

## How this phase was run

The skill's full research sprint (10–15 competitor site visits with a browser) was **not run
for this redesign**. The owner picked the four features directly when scoping the work. This
document records why those four fit, based on general knowledge of how mainstream screeners
work — not a fresh audit of competitor sites. Re-run the sprint before adding more tools.

## Reference points (general knowledge, not re-verified in this session)

| Product type | Typical interactive tools | What the SQL screener can do differently |
|---|---|---|
| Point-and-click screeners (Finviz-style, broker screeners) | Dropdown filters, preset screens, results table, per-ticker quote page with chart | Keep the familiar filters/presets, but show and let you edit the SQL behind them |
| Charting platforms (TradingView-style) | Rich charts, indicators (moving averages), shareable chart links | A light chart with the same MAs the screen filters on, plus shareable *query* links |
| Data/analytics notebooks and SQL playgrounds | Syntax highlighting, autocomplete, saved queries, schema browser | Bring the playground ergonomics to a finance dataset, with no login |

## Gap analysis for this site

| Gap on the old site | Impact | Tool |
|---|---|---|
| Results were a dead end: no per-stock view | Visitors can't check *why* a stock matched | **Detail drawer + chart** |
| Column names (`pct_off_high`, `sma200`) unexplained | Non-finance visitors can't write a query | **Column reference** with click-to-insert |
| A good screen couldn't be shared or bookmarked | Reduces demo value of a portfolio project | **Shareable query links** (`#q=`, `#stock=`) |
| Plain textarea editor | SQL felt fragile; typos were common | **Editor upgrades**: highlighting, autocomplete, history |

## Ranked shortlist

| Rank | Idea | Value | Uniqueness | Fits a client-side static site | Decision |
|---|---|---|---|---|---|
| 1 | Detail drawer with 1Y chart + MAs | High | Medium | Yes: needs a static `history.json` | **Build** |
| 2 | Shareable query links | High | High (SQL in the URL) | Yes: URL hash | **Build** |
| 3 | Editor autocomplete + highlighting | High | Medium | Yes: no library | **Build** |
| 4 | Column reference / glossary | Medium–High | Low | Yes: static HTML, also good for SEO | **Build** |
| 5 | Local query history | Medium | Low | Yes: localStorage | **Build (part of 3)** |
| 6 | Compare 2–4 stocks on one chart | Medium | Medium | Yes | Later |
| 7 | Sector heatmap | Medium | Low | Yes | Later |
| 8 | Saved named screens | Medium | Low | Needs sync to be useful | No (no backend by design) |
| 9 | Price alerts | High elsewhere | Low | Needs a server | No |

## Final selection

The four owner-selected tools (1–4) plus local history. They keep the "no server, no CDN"
architecture and each one fixes a gap found in `DESIGN_AUDIT.md`.
