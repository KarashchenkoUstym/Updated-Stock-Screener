# Rebuild Plan

*Phase 5 · 2026-09-11*

## Scope decision (owner)

**Improve in place.** Keep vanilla HTML/CSS/JS, vendored SQLite WASM, GitHub Pages, the same repo
and the scheduled data Action. The website-rebuild skill's Astro/Vercel/blog/services phases are
deliberately skipped because the site is a single-page tool whose "no server, no CDN" architecture is
the point. Its design, accessibility, SEO, copy and QA standards are applied in full.

Owner-selected features (Phase 11 "tools"): per-stock detail + chart, column reference, shareable
query links, SQL editor upgrades (highlighting, autocomplete, history).

## 1. Site architecture

| URL | Purpose |
|---|---|
| `/` | The screener (single page) |
| `/#q=<base64url SQL>` | Shareable query state |
| `/#stock=<SYMBOL>` | Deep link that opens the detail drawer |
| `/404.html` | Branded not-found page linking back |
| `/robots.txt`, `/sitemap.xml` | Crawl metadata |

In-page order: masthead (title, standfirst, badges, theme toggle, source link) → movers ticker →
sidebar [Filters · tabs: Presets / Columns / History] → workspace [SQL editor · status · results] →
colophon footer (how it works, author, source) → detail drawer (overlay).

## 2. Design direction

See [`DESIGN.md`](../../DESIGN.md) for the complete design system.
- **Aesthetic:** market broadsheet — warm newsprint, serif masthead, tabular mono figures, hairline rules
- **Accent:** a single vermilion "press red"; gains/losses in muted inks, always signed
- **Editions:** light paper edition + dark night edition (system preference, with a manual toggle)

## 3. Colour accessibility pre-check

50 foreground/background pairs across both editions computed with `contrast-check.js`; all pass
WCAG AA (lowest text pair: syntax keyword on editor 4.64:1; lowest UI pair: night input border
3.19:1). Full table in `DESIGN.md` §2.

## 4. Image strategy

| Asset | Decision |
|---|---|
| `◧` glyph, 📊 favicon | REPLACE — SVG monogram `favicon.svg` |
| Social preview | CREATE — `og-image.png` 1200×630 rendered from an SVG in the design system |
| Charts | CREATE — hand-written inline SVG, no chart library |

## 5. Copy strategy

- Lead with what the visitor can find, then the engineering proof
- Keep the README's candid voice; state the snapshot trade-off on the page
- Every column gets a one-sentence plain-English definition
- Details in `COPY_CHANGES.md`

## 6. SEO implementation

- Title stays; description tightened; canonical; OG + Twitter card; JSON-LD `WebApplication`
- Static standfirst + "How it works" colophon + column glossary rendered in HTML for crawlers
- `robots.txt`, `sitemap.xml`, `404.html`

## 7. Tools (owner-selected, see `TOOLS_RESEARCH.md`)

1. **Detail drawer:** 1-year price chart with SMA 50/200, 52-week range bar, key stats, "query similar" action
2. **Column reference:** glossary with click-to-insert into the editor at the cursor
3. **Share links:** "Copy link" encodes SQL in the URL hash; opening the link restores and runs it
4. **Editor:** syntax-highlight overlay, autocomplete (columns, keywords, functions, `stocks`), local query history (last 25)

## 8. Technical plan

- No framework, no build step, no new runtime dependencies; fonts self-hosted in `fonts/`
- `scripts/fetch_data.py` also writes `data/history.json` (shared date axis + per-symbol closes, ~150 KB),
  loaded lazily the first time a drawer opens; Action commits both files
- Performance targets: LCP < 1.5s on desktop, no layout shift from fonts (`font-display: swap` + metric-matched fallbacks), CLS < 0.05

## 9. Accessibility targets

- Zero axe-core critical/serious violations
- Skip link; visible 2px focus ring in accent; keyboard-operable rows, tabs, autocomplete (ARIA combobox/listbox), drawer (dialog with focus trap + Esc)
- `prefers-reduced-motion` honoured; colour never the only signal
