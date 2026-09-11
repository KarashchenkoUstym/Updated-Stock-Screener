# SEO Audit

*Phase 3 · measured in-browser against the live GitHub Pages site, 2026-09-11*

## Technical

| Check | Result | Status |
|---|---|---|
| HTTPS | GitHub Pages, HTTPS | ✅ |
| Page weight (transfer) | ~476 KB incl. 640 KB-raw SQLite WASM | ✅ acceptable for an app |
| `robots.txt` | 404 | ❌ add |
| `sitemap.xml` | 404 | ❌ add (single URL) |
| Canonical tag | missing | ❌ add |
| Custom 404 | GitHub default | ⚠️ add `404.html` |
| Content without JS | Empty shell — headings only, no explanation | ❌ add static intro + `<noscript>` |
| URL structure | single page; no shareable query state | ⚠️ add `#q=` share links (not indexed, but linkable) |

## On-page

| Check | Result | Status |
|---|---|---|
| `<title>` | "SQL Stock Screener — query the market in your browser" (54 chars) | ✅ keep |
| Meta description | 125 chars, accurate | ✅ tighten |
| Headings | 1×H1, 4×H2 (Filters, Presets, SQL…, Results) | ✅ logical; H2s are UI labels, add a descriptive intro |
| Open Graph tags | 0 | ❌ add title/description/image/url/type |
| Twitter card | 0 | ❌ add `summary_large_image` |
| JSON-LD | none | ❌ add `WebApplication` (free, FinanceApplication category) |
| Favicon | emoji data URI | ⚠️ replace with SVG file |
| Image alt text | no images | n/a |

## Content & strategy

- **Keyword targets:** "SQL stock screener", "stock screener SQL query", "free stock screener in browser",
  "SQLite WebAssembly demo". The site already ranks naturally for the first term via the repo name;
  the page needs indexable text that uses these phrases honestly.
- **Blog:** not appropriate for a single-tool portfolio project (owner chose in-place improvement).
  The column reference acts as crawlable glossary content instead (volatility, SMA 50/200,
  52-week high).
- **Local SEO:** not applicable.

## Actions for the rebuild

1. Canonical, OG, Twitter, JSON-LD `WebApplication` in `<head>`
2. `robots.txt` + `sitemap.xml` + `404.html`
3. Static, crawlable standfirst and column glossary in the HTML (not injected by JS)
4. SVG favicon + 1200×630 `og-image.png`
