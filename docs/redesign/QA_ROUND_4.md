# QA Round 4: Tools

*Phase 12 · 2026-09-11 · tested in the in-app Chromium against the local build*

## SQL editor & run

| Case | Expected | Result |
|---|---|---|
| Syntax error `SELEC symbol FROM stocks` | SQLite error shown, previous results kept | ✅ `SQL error — near "SELEC": syntax error`, rows kept |
| No matches | Friendly empty state with next steps | ✅ |
| Blank query | Prompt, no error | ✅ "Nothing to run — write a query or pick a preset." |
| HTML in results `'<b>x</b>'` | Rendered as text | ✅ escaped, no element created |
| Aggregate without `symbol` | Results render, rows not clickable | ✅ |
| `DROP TABLE stocks` | Must not break the session | ❌ → **Fixed**: database set to `PRAGMA query_only` after seeding |
| Autocomplete `vol` + Enter | Inserts `volatility` | ✅ menu shows the option; Enter accepts; menu closes |
| ⌘/Ctrl+Enter | Runs | ✅ |
| History | Explicit runs and presets recorded, deduplicated, max 25 | ✅ |

## Share links

| Case | Result |
|---|---|
| `#q=…&stock=NEE` on load | ✅ query restored and run (4 rows), NextEra drawer opened |
| 2,000+ character query with non-ASCII (`ü€`) | ✅ round-trips exactly through base64url |
| Corrupt `#q=%%%` and unknown `stock=ZZZZ` | ✅ ignored; default screen loads, drawer stays closed |

## Detail drawer & chart

| Case | Result |
|---|---|
| Open from row button | ✅ focus → Close, page `inert`, row highlighted, `#stock=` in URL |
| Esc / backdrop | ✅ closes, focus returns to the row button, scroll unlocked |
| Ranges 1M / 3M / 6M / 1Y | ✅ all render; the 200-day line appears in 1M because averages are computed over the full year first |
| Screen-reader summary | ✅ e.g. "MU closing price from 12 Sep 2025 to 11 Sep 2026: 157.23 to 975.26 dollars, up 520.3%." |
| Mobile 375px | ✅ full-screen sheet; chart, 52-week range, 8 stats, actions |
| "Compare with sector" / "Similar volatility" | ✅ write SQL into the editor, run, scroll to results |

## Not verifiable locally

- `404.html` uses `/Updated-Stock-Screener/…` absolute paths so it works at any depth on GitHub Pages. On `localhost` it renders unstyled; check it on the deployed site.
