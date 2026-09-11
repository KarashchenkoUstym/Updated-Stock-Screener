# Accessibility Audit

Tools: **axe-core 4.10.2** (in-browser), **contrast-check.js** (WCAG 2.1 relative luminance), manual keyboard testing. WCAG 2.2 AA target.

## Baseline — live site before redesign (2026-09-11)

| Impact | Rule | Where | Detail |
|---|---|---|---|
| serious | `color-contrast` | `.hint` | 3.91:1 (`#6e7988` on `#151b23`) |
| serious | `scrollable-region-focusable` | `.table-wrap` | Scrolling results not keyboard reachable |
| (manual) | focus visibility | inputs | Focus outline `#2d5f9e` on `#1c2430` — weak ring |
| (manual) | target size | Run button, inputs | 30–36px tall |

## Pass 1 — local build (2026-09-11)

| Impact | Rule | Where | Fix |
|---|---|---|---|
| minor | `aria-allowed-role` | `textarea#sql` had `role="combobox"` | Removed role and `aria-expanded`; kept `aria-autocomplete`, `aria-controls`, `aria-activedescendant` (valid on the textbox role) |
| (manual) | target size (2.5.8) | `.row-btn` 21px tall | Padding → 33px; entire row also opens the drawer |
| (manual) | target size | "Reset filters" 32px on touch layouts | 44px below 1024px |

## Pass 2 — after guidelines fixes (2026-09-11)

| Scope | Critical | Serious | Moderate | Minor |
|---|---|---|---|---|
| Page, paper edition | 0 | 0 | 0 | 0 |
| Page, night edition | 0 | 0 | 0 | 0 |
| Detail drawer (open) | 0 | 0 | 0 | 1 → fixed |

Minor finding fixed: `role="dialog"` is not permitted on `<aside>` — the drawer is now a `<div role="dialog" aria-modal="true">`.

## Keyboard & screen reader behaviour verified

- Skip link is the first focusable element and jumps to the SQL editor
- Results region is focusable (`role="region"`, `tabindex="0"`, labelled by the Results heading)
- Symbol cells are `<button>`s; Enter/Space opens the drawer
- Drawer: focus moves to Close; page behind is `inert`; Esc and backdrop close it; focus returns to the row button (verified)
- Tabs: roving tabindex with ←/→/Home/End, `aria-selected`, `aria-controls`
- Autocomplete: Ctrl+Space opens, ↑/↓ moves (`aria-activedescendant`), Enter/Tab accepts, Esc closes; Tab passes through when the menu is closed (no keyboard trap)
- Chart: focusable `role="img"` with a full-sentence `aria-label` and `<figcaption>`; ←/→ (Shift = 10 days), Home/End move the cursor
- Status line is `role="status"`; toasts are mirrored into an `aria-live="polite"` region
- Gains/losses always carry `+`/`−` signs; status uses ✓/✕ as well as colour
- Ticker has a visible Pause/Play button (2.2.2) and stops entirely under `prefers-reduced-motion`
- All animation disabled under `prefers-reduced-motion`

## Contrast — every token pair

Computed with `contrast-check.js`. Text needs 4.5:1, UI boundaries/graphics 3:1.

| Pair | Paper edition | Night edition |
|---|---|---|
| ink / sheet | 16.41 | 14.53 |
| ink / sheet-2 | 14.01 | 13.13 |
| ink / highlight | 13.94 | 12.28 |
| ink-2 / sheet | 7.30 | 7.90 |
| ink-2 / sheet-2 | 6.24 | 7.13 |
| ink-3 / sheet | 5.44 | 5.85 |
| ink-3 / sheet-2 (placeholders, comments) | 4.65 | 5.28 |
| accent / sheet | 5.43 | 7.06 |
| accent / paper | 4.98 | — |
| on-accent / accent | 5.46 | 7.68 |
| on-accent / accent-hover | 7.26 | 9.18 |
| up / sheet | 5.79 | 8.41 |
| up / highlight | 4.91 | 7.10 |
| down / sheet | 6.45 | 6.44 |
| down / highlight | 5.48 | 5.44 |
| syntax keyword / sheet-2 | 4.64 | 6.37 |
| syntax string / sheet-2 | 5.14 | 9.37 |
| syntax number / sheet-2 | 5.55 | 7.62 |
| syntax function / sheet-2 | 5.77 | 7.67 |
| rule-strong (input border) / sheet | 3.63 | 3.19 |
| focus ring / sheet | 5.43 | 7.06 |
| SMA 200 line / sheet | 6.49 | 8.44 |

All 50 pairs pass.
