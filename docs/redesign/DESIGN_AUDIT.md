# Design & UX Audit

*Phase 4 · live site, desktop and 375px mobile, 2026-09-11*

## Accessibility baseline (axe-core 4.10.2, desktop)

| Rule | Impact | Where | Detail |
|---|---|---|---|
| `color-contrast` | serious | `.hint` ("— edit it, it's a real database") | 3.91:1 (`#6e7988` on `#151b23`) — needs 4.5:1 |
| `scrollable-region-focusable` | serious | `.table-wrap` | Horizontally scrolling results can't be reached by keyboard |

Also found by inspection:
- Focus outline uses `--accent-dim` `#2d5f9e` on `#1c2430` — low-contrast focus ring
- No skip link; no `prefers-reduced-motion` handling (little motion today)
- Most buttons/inputs are 30–36px tall — under the 44px touch minimum on mobile (Run is 30px)
- Result rows aren't interactive, so there's nothing to do with a stock once found

## Visual design

| Area | Finding |
|---|---|
| Aesthetic | Competent but generic: a near-exact GitHub dark theme. Nothing about it says "markets" |
| Colour | Blue accent + green/red; accent blue is also the symbol colour, so nothing stands out as *the* action |
| Typography | System UI font and system mono; all headings are tiny uppercase labels, no hierarchy or voice |
| Spacing | Consistent but uniformly tight; the header is visually weaker than the filter panel |
| Hierarchy | The Run button and the results compete with 7 filter controls at the same weight |

## UX

| Area | Finding |
|---|---|
| First 5 seconds | Tagline explains the tech, not what the visitor can find ("which stocks…") |
| Discoverability | Column names (`pct_off_high`, `sma200`) are unexplained; the SQL editor has no help or autocomplete |
| Flow | Results are a dead end — no per-stock view, no chart |
| Sharing | A good query can't be sent to someone; refresh loses custom SQL |
| Editor | Plain textarea: no highlighting, no completion, no history; only ⌘↵ shortcut |
| Mobile | Filters stack above the editor, pushing results far below the fold; small tap targets |
| Trust | Strong: live SQLite version and data age badges. Keep and make more prominent |

## Conversion (for a portfolio tool, "conversion" = someone runs a query and understands the engineering)

- Primary action (Run) is visually small and top-right; presets are the best on-ramp but sit at the bottom of the sidebar
- No link to the source code / README from the page — the engineering story is invisible to visitors
- Author credit has no link
