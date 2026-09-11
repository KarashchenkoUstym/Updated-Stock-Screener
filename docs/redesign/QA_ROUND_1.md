# QA Round 1: Functional & Content

*Phase 8 · local server (`python3 -m http.server`), in-app Chromium, 2026-09-11*

## Checks

| Area | Result |
|---|---|
| Boot | SQLite 3.49.1 WASM starts; 103 rows render; no console errors |
| Fonts | All 6 self-hosted faces load (Instrument Serif ×2, Schibsted Grotesk, IBM Plex Mono ×3) |
| Local files | `/`, `js/*.js`, `data/history.json`, `favicon.svg`, `404.html` → 200 |
| HTML | Balanced tags, no duplicate IDs (`index.html`, `404.html`) |
| Filters | Sector/sort/checkbox run on change; number inputs run after 300 ms idle |
| Presets | All 6 run; "Sector scorecard" returns 11 rows (non-stock rows correctly not clickable) |
| Ticker | 16 biggest one-month movers; buttons open the drawer; hidden < 640px |
| Desktop 1440 | Sidebar 342px + workspace 1026px; no horizontal page scroll |
| Mobile 375 | No horizontal scroll; filters/helpers collapsed; editor 16px (no iOS zoom) |
| Theme | Toggle paper ↔ night works, persists in `localStorage`, syncs `theme-color` |

## Defects found & fixed

| # | Defect | Fix |
|---|---|---|
| 1 | Preview tab blank: server bound to 127.0.0.1, `localhost` resolved to ::1 | Test via `http://127.0.0.1:8765` (environment only, not a site bug) |
| 2 | Company names rendered "Technology , Inc ." | `tabular-nums` also fixes punctuation width; reset to `normal` on text cells |
| 3 | Chart y-axis showed only 2 labels on wide ranges | Tick target 4 → 5 |
| 4 | Mobile: six presets pushed the query ~1,300px down | Presets/Columns/History moved into a collapsible section, closed < 1024px (query now starts at 568px) |
| 5 | Symbol buttons 21px tall; "Reset filters" 32px on touch | 33px hit area; 44px text buttons < 1024px |
| 6 | Invalid ARIA: `role="combobox"` on `<textarea>` | Removed; see ACCESSIBILITY_AUDIT.md |

## Accessibility

axe-core: 0 critical / 0 serious (was 2 serious on the live site). Details in `ACCESSIBILITY_AUDIT.md`.
