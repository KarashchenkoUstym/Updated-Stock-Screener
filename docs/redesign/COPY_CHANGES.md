# Copy Changes

*Phase 7 · the audience is a curious visitor (often a recruiter or developer) who should understand what they can do in 5 seconds and how it works in 30.*

| Where | Before | After | Why |
|---|---|---|---|
| Headline | SQL Stock Screener | SQL Stock *Screener* (serif, accent italic) | Same name — identity and SEO continuity |
| Tagline → standfirst | "Real SQL. Real market data. Running entirely in your browser." | "Find the stocks that fit your idea — momentum leaders, beaten-down names, the calmest performers — by writing **real SQL** against **real, daily-refreshed prices**. The database runs in your browser, so every query answers in milliseconds." | Leads with the benefit (finding stocks) and gives concrete examples, then the proof |
| Data badge | "103 stocks · real prices · under an hour ago" | "103 stocks · updated under an hour ago" | "Updated" is the word people scan for; "real" moved to the standfirst |
| Dateline (new) | — | "Markets edition · Friday, 11 September 2026" | Freshness at a glance; sets the broadsheet voice |
| SQL panel heading | "SQL — edit it, it's a real database" (failed contrast) | "Query" + hint "Ctrl+Space suggests columns · ⌘/Ctrl+↵ runs" | Replaces a claim with instructions people can use |
| Run button | "Run ⌘↵" | "Run query ⌘↵" (Ctrl ↵ on Windows/Linux) | Specific label; correct shortcut per platform |
| Filter labels | "Min price", "Max volatility (% annualised)" | "Min price $", "Max volatility % (annualised)" | Units up front |
| Sort options | "1-year return ▼" | "1-year return, highest first" | Arrows are ambiguous; words aren't |
| Sector default | "Any" | "All sectors" | Reads as a choice, not a blank |
| Empty result | "No rows matched. Loosen a filter or edit the SQL." | "No rows matched. Loosen a filter, reset them, or edit the SQL." | Offers every next step |
| Column reference (new) | — | One plain-English line per column, e.g. volatility: "How much the price swings… Under 25 is calm, over 50 is wild." | Makes `pct_off_high`, `sma200` usable without finance jargon |
| Colophon (new) | Footer: "Built by Ustym Karashchenko" | Three short sections: *Real SQL, in your browser* · *Real prices, refreshed daily* · *Built to stay up* + linked byline | Tells the engineering story from the README on the page, crawlable, and states the snapshot trade-off and "not investment advice" plainly |
| Detail drawer (new) | — | "Compare with Technology →", "Find stocks with similar volatility →" | Every dead-end now leads to another query |
| Errors | "could not load data/stocks.json (404)" only | Adds "The database couldn’t start. Check your connection and reload." in the table | Error states say what to do |
| History empty state (new) | — | "Queries you run with the Run button or a preset appear here." | Explains why the list is empty |
| 404 (new) | GitHub default | "This page didn’t make the edition." + "Back to the screener" | On-brand and gives a way back |

Preserved verbatim: all six preset names/notes and their SQL; the owner's candid framing of trade-offs.

Typography: curly apostrophes and quotes in visible copy; "…" on loading states and placeholders.
