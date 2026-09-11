# DESIGN.md — SQL Stock Screener

## 1. Visual Theme & Atmosphere

The SQL Stock Screener is a **market broadsheet you can query**. It takes the visual grammar of a
financial newspaper's stock tables — warm newsprint, hairline column rules, a serif masthead, dense
tabular figures — and makes every column live. The page reads like the markets section of a paper
printed this morning, except the tables answer back when you write SQL.

The mood is calm authority with a single hot accent. Ink-black type on warm paper carries almost
everything; a vermilion "press red" marks the one thing you should do next (run the query, open a
stock, copy a link). Gains and losses use muted ink greens and reds that stay readable in both
editions, and are always paired with a `+`/`−` sign so colour is never the only signal. At night the
same system inverts into a **night edition**: warm charcoal paper, cream ink, and a brighter
vermilion.

Density is intentional. This is a working tool, so the layout chooses *controlled density* over
empty space: hairline rules instead of heavy cards, tight tabular numerals, and a clear reading order
(masthead → filters → query → results → detail).

**Key Characteristics:**
- Serif masthead in Instrument Serif with an italic dateline — the page opens like a newspaper front
- Warm newsprint paper (`#F3EEE3`) with a faint grain texture, never flat white
- Hairline column rules (`1px` `#D9D0BF`) separate regions; shadows are reserved for floating layers
- One accent, vermilion `#B83A0B`, used only for primary actions, focus and the active selection
- IBM Plex Mono with tabular figures for every number, symbol and line of SQL
- Near-square geometry: 2–4px radii; nothing pill-shaped except status badges
- A scrolling market ticker of the day's biggest movers under the masthead (static when reduced motion is on)
- Light "paper edition" and dark "night edition" share one token set

---

## 2. Color Palette & Roles

Light values first, dark (night edition) values in brackets. All ratios computed with
`website-rebuild/scripts/contrast-check.js`.

### Primary
- **Ink** (`#1B1A17` [`#EFE9DC`]): `--ink` — Headings, body text, table figures. 16.41:1 on sheet [14.53:1]
- **Paper** (`#F3EEE3` [`#12110F`]): `--paper` — Page background behind panels

### Accent
- **Press Red** (`#B83A0B` [`#FF8047`]): `--accent` — Run button, active tab, selected row marker, focus. 5.43:1 on sheet [7.06:1]
- **Press Red Hover** (`#97300A` [`#FF9A6B`]): `--accent-hover` — Hover/active state of accent buttons
- **On Accent** (`#FFF8EE` [`#1A0C04`]): `--on-accent` — Text on accent backgrounds. 5.46:1 [7.68:1]; on hover 7.26:1 [9.18:1]

### Interactive
- **Link Default** (`#B83A0B` [`#FF8047`]): `--accent` — Text buttons ("copy link", "export CSV")
- **Link Hover** (`#97300A` [`#FF9A6B`]): `--accent-hover` — plus underline
- **Focus Ring** (`#B83A0B` [`#FF8047`]): `--focus` — 2px outline, 2px offset. 5.43:1 [7.06:1] vs sheet
- **Gain** (`#17703D` [`#4CC98C`]): `--up` — Positive returns. 5.79:1 [8.41:1]; on highlight 4.91:1 [7.10:1]
- **Loss** (`#B0201A` [`#FF6F61`]): `--down` — Negative returns, SQL errors. 6.45:1 [6.44:1]; on highlight 5.48:1 [5.44:1]
- **Warning** (`#7A5A00` [`#E3C46F`]): `--warn` — Stale-data badge. 5.14:1 on sheet-2 [9.37:1]

### Neutral Scale
- **Sheet** (`#FBF8F1` [`#1A1916`]): `--sheet` — Panel surfaces
- **Sheet 2** (`#EDE6D8` [`#24221E`]): `--sheet-2` — Inputs, editor, table header, zebra
- **Highlight** (`#F4E4CC` [`#2F261B`]): `--highlight` — Hovered/selected table row
- **Ink 2** (`#57524A` [`#B5AD9E`]): `--ink-2` — Secondary text, labels. 7.30:1 on sheet [7.90:1]; 6.24:1 on sheet-2 [7.13:1]
- **Ink 3** (`#6B655B` [`#9C9484`]): `--ink-3` — Placeholders, captions, SQL comments. 5.44:1 on sheet [5.85:1]; 4.65:1 on sheet-2 [5.28:1]
- **Rule Strong** (`#8A8171` [`#6F685C`]): `--rule-strong` — Input borders (UI component). 3.63:1 [3.19:1]
- **Rule** (`#D9D0BF` [`#34312B`]): `--rule` — Decorative hairlines only (never the sole boundary of a control)

### Syntax (SQL editor, on sheet-2)
- **Keyword** (`#B83A0B` [`#FF8047`]): `--syn-kw` — 4.64:1 [6.37:1]
- **String** (`#7A5A00` [`#E3C46F`]): `--syn-str` — 5.14:1 [9.37:1]
- **Number** (`#1F5B9E` [`#82B6FF`]): `--syn-num` — 5.55:1 [7.62:1]
- **Function** (`#7B3C96` [`#CFA2F5`]): `--syn-fn` — 5.77:1 [7.67:1]
- **Comment** (`#6B655B` [`#9C9484`]): `--syn-com` — 4.65:1 [5.28:1]

### Chart
- **Price line** `--ink` (16.41:1), **SMA 50** `--accent` (5.43:1), **SMA 200** `--syn-num` (6.49:1 [8.44:1]) — all ≥3:1 as graphical objects

### Shadow Colors
- **Shadow SM** (`rgba(58, 42, 20, 0.06)` [`rgba(0, 0, 0, 0.30)`]): `--shadow-sm` — Resting popovers
- **Shadow MD** (`rgba(58, 42, 20, 0.12)` [`rgba(0, 0, 0, 0.45)`]): `--shadow-md` — Autocomplete menu
- **Shadow LG** (`rgba(58, 42, 20, 0.22)` [`rgba(0, 0, 0, 0.60)`]): `--shadow-lg` — Detail drawer

---

## 3. Typography Rules

**Display Font:** Instrument Serif, "Iowan Old Style", "Palatino Linotype", Georgia, serif
**UI Font:** Schibsted Grotesk (variable 400–900), "Avenir Next", "Segoe UI", sans-serif
**Mono Font:** IBM Plex Mono, ui-monospace, "SF Mono", Menlo, monospace

All fonts self-hosted from `fonts/` (OFL-1.1), `font-display: swap`.

**OpenType Features:** `font-variant-numeric: tabular-nums;` on all mono and table cells;
`font-feature-settings: 'ss01';` not used (Plex Mono default zero is clear enough).

### Type Scale

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|---|---|---|---|---|---|---|
| Display / Hero | Instrument Serif | 56px / 3.5rem | 400 | 1.0 | -0.02em | Masthead title only |
| H1 | Instrument Serif | 40px / 2.5rem | 400 | 1.05 | -0.015em | Detail drawer company name |
| H2 | Instrument Serif | 26px / 1.625rem | 400 | 1.15 | -0.01em | Panel titles (italic variant for "Results") |
| H3 | Schibsted Grotesk | 13px / 0.8125rem | 650 | 1.3 | 0.08em | Uppercase section labels |
| H4 | Schibsted Grotesk | 16px / 1rem | 600 | 1.35 | 0 | Preset names, stat labels |
| Body Large | Schibsted Grotesk | 18px / 1.125rem | 400 | 1.55 | 0 | Masthead standfirst |
| Body | Schibsted Grotesk | 15px / 0.9375rem | 400 | 1.6 | 0 | Default UI text (16px on mobile) |
| Body Small | Schibsted Grotesk | 13px / 0.8125rem | 400 | 1.5 | 0.005em | Descriptions, hints |
| Label | Schibsted Grotesk | 12px / 0.75rem | 550 | 1.4 | 0.06em | Form labels, uppercase |
| Code | IBM Plex Mono | 14px / 0.875rem | 400 | 1.65 | 0 | SQL editor |
| Data | IBM Plex Mono | 13px / 0.8125rem | 400 | 1.4 | 0 | Table cells, tabular-nums; symbols at 600 |
| Button | Schibsted Grotesk | 14px / 0.875rem | 650 | 1 | 0.02em | All buttons |

---

## 4. Component Stylings

### Buttons

**Primary Button (Run)**
- Default: `bg: #B83A0B; color: #FFF8EE; padding: 10px 16px; border-radius: 3px; shadow: none; font-weight: 650; font-size: 14px; min-height: 40px;`
- Hover: `bg: #97300A; shadow: 0 1px 0 rgba(58,42,20,0.12);`
- Focus: `outline: 2px solid #B83A0B; outline-offset: 2px;`
- Active: `bg: #97300A; transform: translateY(1px); shadow: none;`
- Disabled: `opacity: 0.5; cursor: not-allowed;`

**Secondary Button (Copy link, Export CSV, tabs)**
- Default: `bg: transparent; color: #1B1A17; border: 1px solid #8A8171; padding: 8px 12px; border-radius: 3px;`
- Hover: `bg: #EDE6D8; border-color: #1B1A17;`
- Focus: `outline: 2px solid #B83A0B; outline-offset: 2px;`
- Active: `bg: #F4E4CC;`

**Text Button (reset, clear history)**
- Default: `bg: none; color: #B83A0B; padding: 4px 0; text-decoration: none;`
- Hover: `color: #97300A; text-decoration: underline; text-underline-offset: 3px;`

### Cards (panels)
- Background: `#FBF8F1`
- Border: `1px solid #D9D0BF`
- Shadow: `none` (Level 0 — rules, not cards)
- Border Radius: `4px`
- Padding: `20px`

### Inputs
- Background: `#EDE6D8`
- Border: `1px solid #8A8171`
- Border (Focus): `1px solid #B83A0B`
- Focus Ring: `outline: 2px solid #B83A0B; outline-offset: 1px`
- Padding: `8px 10px`
- Placeholder Color: `#6B655B`
- Border Radius: `3px`
- Font Size: `15px` desktop / `16px` mobile (prevents iOS zoom)

### Navigation (masthead + tabs)
- Background: `#F3EEE3` with grain
- Link Color: `#1B1A17`
- Link Hover: `#B83A0B`
- Active Indicator: 2px bottom border in `#B83A0B` on the active tab; `aria-selected="true"`
- Mobile: filters collapse into a `<details>` disclosure above the workspace

### Results Table
- Header: `bg #EDE6D8; color #57524A; 12px Label style; sticky`
- Row: `border-bottom 1px solid #D9D0BF`; hover/selected `bg #F4E4CC` with a 3px `#B83A0B` left marker on the selected row
- Numbers: right-aligned Data style; gains `#17703D` with `+`, losses `#B0201A` with `−`
- Rows are keyboard-focusable buttons for the detail drawer (Enter/Space opens)

### Detail Drawer
- Right-side sheet, 480px wide desktop, full-screen on mobile; `bg #FBF8F1`; Level 3 shadow
- SVG chart: price line `--ink` 1.5px, SMA50 `--accent` 1.25px, SMA200 `--syn-num` 1.25px dashed; axis text `--ink-3` 11px mono
- 52-week range bar: track `--sheet-2`, marker `--accent`

### Autocomplete Menu
- `bg #FBF8F1; border 1px solid #8A8171; radius 3px; shadow Level 2; max-height 240px`
- Active option `bg #F4E4CC`; kind tag (column/keyword/function) in Label style `--ink-3`

---

## 5. Layout Principles

- **Base Unit:** 4px
- **Spacing Scale:** 4 / 8 / 12 / 16 / 20 / 24 / 32 / 48 / 64
- **Max Container Width:** 1480px (a wide broadsheet: tables need horizontal room)
- **Grid Columns:** 12 columns, 20px gutter; desktop sidebar spans 3 (min 280px), workspace spans 9
- **Section Spacing:** 24px between panels; 32px masthead bottom padding
- **Border-Radius Scale:**
  - Small (tags, badges): 2px
  - Medium (buttons, inputs): 3px
  - Large (panels, drawer): 4px
  - XL (not used — broadsheet geometry stays square)
  - Full (status badges only): 9999px

---

## 6. Depth & Elevation

| Level | Name | Shadow Value | Usage |
|---|---|---|---|
| 0 | Flat | `none` | Panels, table, inputs — separated by rules |
| 1 | Low | `0 1px 2px rgba(58,42,20,0.06), 0 1px 3px rgba(58,42,20,0.06)` | Hovered primary button, toast |
| 2 | Medium | `0 4px 6px rgba(58,42,20,0.12), 0 2px 4px rgba(58,42,20,0.06)` | Autocomplete menu |
| 3 | High | `0 10px 30px rgba(58,42,20,0.22), 0 4px 6px rgba(58,42,20,0.06)` | Detail drawer |
| 4 | Highest | `0 20px 40px rgba(58,42,20,0.22), 0 10px 10px rgba(58,42,20,0.12)` | Drawer backdrop layer on mobile |

Night edition swaps the shadow colour to `rgba(0,0,0,…)` with doubled alpha.

---

## 7. Do's and Don'ts

### Do
- Put every number in IBM Plex Mono with `tabular-nums` so columns align like a printed stock table
- Pair every gain/loss colour with a sign (`+2.31%`, `−4.10%`)
- Use `--accent` for at most one primary action per region (Run in the workspace, Open in the drawer)
- Separate regions with `--rule` hairlines; reserve shadows for things that float (menu, drawer)
- Keep the SQL visible — filters, presets, columns and history all write into the editor
- Use the Instrument Serif italic sparingly: dateline, "Results", drawer company name
- Give every interactive target at least 40px height (44px on touch layouts)
- Respect `prefers-reduced-motion`: the ticker stops and reveals become instant
- Reference tokens only; hex values live solely in `:root` blocks

### Don't
- Don't use pure white or pure black surfaces — paper is `#FBF8F1` / `#12110F`
- Don't use `--rule` (`#D9D0BF`) as the only border of an input — it fails 3:1; use `--rule-strong`
- Don't colour a whole row green or red; only the figures carry sentiment
- Don't add rounded "SaaS cards" with drop shadows around panels
- Don't introduce a second accent hue; SQL syntax colours stay inside the editor and chart
- Don't load fonts, scripts or data from a CDN — the site must survive any third-party outage
- Don't hide the SQL behind the filter UI
- Don't use Inter, Roboto, Space Grotesk or system-ui as a visible face

### The AI Slop Test
> If someone saw this and was told AI made it, would they believe it? If yes, redesign.

Tells this design avoids: dark-blue GitHub-clone dashboard, purple gradients, centred hero over a
gradient, identical rounded cards, emoji icons as decoration.

---

## 8. Responsive Behavior

### Breakpoints

| Name | Width | Key Changes |
|---|---|---|
| Mobile | < 640px | Masthead title 36px; filters inside `<details>`; drawer full-screen; inputs 16px; ticker hidden |
| Tablet | 640px - 1023px | Single column; filters expanded as a 2-column form above the workspace |
| Desktop | 1024px - 1279px | Sidebar (280px) + workspace; drawer overlays the workspace from the right |
| Wide | >= 1280px | Container capped at 1480px, centred; drawer 480px |

### Touch Targets
- Minimum touch target: 44x44px below 1024px; 40px on desktop pointer layouts
- Minimum spacing between targets: 8px

### Font Scaling
- Mobile: Body 16px, Display 36px, H1 30px, H2 22px
- Tablet: Body 15px, Display 48px, H1 36px, H2 24px
- Desktop+: Full type scale as defined in Section 3

### Collapsing Strategy
- **Navigation:** Masthead actions (theme, copy link) stay inline; wrap below the title on mobile
- **Grid:** 3/9 sidebar split → single column below 1024px
- **Cards:** Panels stack full width
- **Hero:** Masthead padding halves on mobile; ticker hidden below 640px
- **Tables:** Horizontal scroll inside a focusable `role="region"` wrapper; symbol column sticky on the left

---

## 9. Agent Prompt Guide

### Quick Color Reference
```
Primary:    #1B1A17    Accent:     #B83A0B
Text:       #1B1A17    Subtle:     #57524A
Surface:    #FBF8F1    Border:     #8A8171
Link:       #B83A0B    Focus:      #B83A0B
Paper:      #F3EEE3    Highlight:  #F4E4CC
Gain:       #17703D    Loss:       #B0201A
```

### Component Prompts

**"Build the masthead"**
- Container: max-width 1480px, padding 32px 24px 20px, bottom border 1px solid #1B1A17 plus a 3px double rule
- Title: Instrument Serif, 56px, weight 400, color #1B1A17, letter-spacing -0.02em
- Dateline: Instrument Serif italic, 18px, color #57524A
- Primary action: bg #B83A0B, color #FFF8EE, padding 10px 16px, radius 3px
- Background: #F3EEE3 with grain overlay at 4% opacity

**"Build a stat grid in the detail drawer"**
- Grid: 2 columns, 12px gap, single column below 360px
- Cell: bg #EDE6D8, border 1px solid #D9D0BF, radius 3px, padding 12px
- Label: Schibsted Grotesk, 12px, weight 550, uppercase, color #57524A
- Value: IBM Plex Mono, 18px, weight 500, color #1B1A17, tabular-nums

**"Build a results table"**
- Wrapper: overflow-x auto, border 1px solid #D9D0BF, radius 4px, tabindex 0, role region
- Header cells: bg #EDE6D8, Schibsted Grotesk 12px weight 550 uppercase, color #57524A, sticky top 0
- Body cells: IBM Plex Mono 13px, color #1B1A17, padding 8px 12px, border-bottom 1px solid #D9D0BF
- Hover row: bg #F4E4CC; selected row: plus inset 3px left border #B83A0B

**"Build a preset list"**
- Item: full-width button, bg transparent, border-bottom 1px solid #D9D0BF, padding 12px 0
- Name: Schibsted Grotesk 16px weight 600 color #1B1A17; hover color #B83A0B
- Note: Schibsted Grotesk 13px color #57524A
