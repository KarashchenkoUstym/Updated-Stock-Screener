/**
 * SQL Stock Screener
 *
 * Loads a real SQLite database (compiled to WebAssembly) in the browser, seeds it
 * from data/stocks.json, and runs whatever SQL you type against it. There is no
 * server anywhere in this application - which is precisely why it can't go down.
 */

const NUMERIC = new Set([
  "price", "change_1m", "change_3m", "change_1y", "high_52w", "low_52w",
  "pct_off_high", "volatility", "avg_volume", "sma50", "sma200",
]);
// Columns where a negative number should read red and positive green.
const SIGNED = new Set(["change_1m", "change_3m", "change_1y", "pct_off_high"]);

const PRESETS = [
  {
    label: "Momentum leaders",
    note: "up big over a year, still near highs",
    sql: `SELECT symbol, name, sector, price, change_1y, pct_off_high\nFROM stocks\nWHERE change_1y > 20 AND pct_off_high > -10\nORDER BY change_1y DESC;`,
  },
  {
    label: "Beaten down",
    note: "20%+ below the 52-week high",
    sql: `SELECT symbol, name, sector, price, high_52w, pct_off_high, change_1y\nFROM stocks\nWHERE pct_off_high < -20\nORDER BY pct_off_high ASC;`,
  },
  {
    label: "Low volatility",
    note: "calmest names, positive on the year",
    sql: `SELECT symbol, name, sector, price, volatility, change_1y\nFROM stocks\nWHERE change_1y > 0\nORDER BY volatility ASC\nLIMIT 20;`,
  },
  {
    label: "Golden cross",
    note: "50-day above 200-day average",
    sql: `SELECT symbol, name, sector, price, sma50, sma200, change_3m\nFROM stocks\nWHERE sma50 > sma200\nORDER BY change_3m DESC;`,
  },
  {
    label: "Sector scorecard",
    note: "aggregate — grouping, not just filtering",
    sql: `SELECT sector,\n       COUNT(*)                AS names,\n       ROUND(AVG(change_1y), 1) AS avg_1y_pct,\n       ROUND(AVG(volatility), 1) AS avg_vol\nFROM stocks\nGROUP BY sector\nORDER BY avg_1y_pct DESC;`,
  },
  {
    label: "Best risk-adjusted",
    note: "return per unit of volatility",
    sql: `SELECT symbol, name, change_1y, volatility,\n       ROUND(change_1y / volatility, 2) AS return_per_risk\nFROM stocks\nWHERE volatility > 0 AND change_1y > 0\nORDER BY return_per_risk DESC\nLIMIT 20;`,
  },
];

const HISTORY_KEY = "queryHistory";
const HISTORY_MAX = 25;

const $ = (id) => document.getElementById(id);
const state = {
  db: null, editor: null, columns: [], rows: [],
  stocks: new Map(), history: null, selected: null, lastFocus: null, chartDays: 0,
};

/* ── Small utilities ─────────────────────────────────── */
function setStatus(msg, kind = "") {
  const el = $("status");
  el.textContent = msg;
  el.className = "status" + (kind ? " " + kind : "");
}

function announce(msg, visible = true) {
  $("live").textContent = msg;
  if (!visible) return;
  document.querySelectorAll(".toast").forEach((t) => t.remove());
  const t = document.createElement("div");
  t.className = "toast";
  t.setAttribute("aria-hidden", "true");
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

const signed = (v, digits = 2) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(digits)}%`;
const trend = (v) => (v > 0 ? "up" : v < 0 ? "down" : "");

function format(col, val) {
  if (val === null || val === undefined) return "—";
  if (typeof val !== "number") return String(val);
  if (col === "avg_volume") return val.toLocaleString();
  if (SIGNED.has(col)) return signed(val);
  if (col === "volatility") return `${val.toFixed(2)}%`;
  if (NUMERIC.has(col)) return val.toFixed(2);
  return Number.isInteger(val) ? String(val) : val.toFixed(2);
}

const store = {
  get(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} },
};

/* ── URL state: #q=<base64url SQL>&stock=SYMBOL ───────── */
function encodeSql(sql) {
  const bytes = new TextEncoder().encode(sql);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function decodeSql(s) {
  try {
    const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
    return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
  } catch { return null; }
}
function readHash() {
  const p = new URLSearchParams(location.hash.slice(1));
  return { sql: p.get("q") ? decodeSql(p.get("q")) : null, stock: p.get("stock") };
}
function writeHash({ sql = state.editor?.value, stock = state.selected } = {}) {
  const p = new URLSearchParams();
  if (sql) p.set("q", encodeSql(sql));
  if (stock) p.set("stock", stock);
  history.replaceState(null, "", `${location.pathname}${location.search}#${p}`);
}

/* ── Boot ────────────────────────────────────────────── */
async function boot() {
  initTheme();
  initTabs();
  $("runKbd").textContent = /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘↵" : "Ctrl ↵";
  // On narrow screens keep the query and results near the top: sidebar sections start collapsed.
  if (matchMedia("(max-width: 1023px)").matches) $("filters").open = $("helpers").open = false;

  const columns = [...document.querySelectorAll("#columns [data-col]")].map((b) => ({ name: b.dataset.col }));
  state.editor = SqlEditor.attach({
    input: $("sql"), pre: $("sqlHl"), menu: $("acMenu"), columns,
    onRun: () => run({ record: true }),
  });

  try {
    const [SQL, payload] = await Promise.all([
      initSqlJs({ locateFile: () => "vendor/sql-wasm.wasm" }),
      fetch("data/stocks.json").then((res) => {
        if (!res.ok) throw new Error(`could not load data/stocks.json (${res.status})`);
        return res.json();
      }),
    ]);

    state.db = new SQL.Database();
    seed(state.db, payload.stocks);
    // Reads only from here on: a stray DROP or DELETE would otherwise break every later query until reload.
    state.db.run("PRAGMA query_only = ON;");
    payload.stocks.forEach((s) => state.stocks.set(s.symbol, s));

    $("engineBadge").textContent = `SQLite ${versionOf(state.db)} · WASM`;
    $("engineBadge").className = "badge ready";
    showProvenance(payload);

    populateSectors(payload.stocks);
    renderPresets();
    renderHistory();
    renderTicker(payload.stocks);
    wireEvents();

    const { sql, stock } = readHash();
    if (sql) state.editor.setValue(sql);
    else buildSqlFromFilters();
    run();
    if (stock && state.stocks.has(stock)) openDrawer(stock);
  } catch (err) {
    $("engineBadge").textContent = "failed to start";
    $("engineBadge").className = "badge error";
    setStatus(String((err && err.message) || err), "err");
    renderTable([], [], "The database couldn’t start. Check your connection and reload.");
  }
}

/** Surface exactly how old the data is, in the header badge, dateline and footer. */
function showProvenance(payload) {
  const when = new Date(payload.generated_at);
  const hours = (Date.now() - when.getTime()) / 36e5;
  const age =
    hours < 1 ? "under an hour ago" :
    hours < 24 ? `${Math.round(hours)} hour${Math.round(hours) === 1 ? "" : "s"} ago` :
    `${Math.round(hours / 24)} day${Math.round(hours / 24) === 1 ? "" : "s"} ago`;

  const stamp = when.toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", timeZoneName: "short",
  });

  const badge = $("dataBadge");
  badge.textContent = `${payload.count} stocks · updated ${age}`;
  badge.title = `Fetched ${stamp} from ${payload.source}`;
  badge.className = "badge ready";
  // Nudge the badge amber once the snapshot is over a week old.
  if (hours > 168) badge.className = "badge stale";

  $("dateline").textContent = `Markets edition · ${when.toLocaleDateString(undefined, {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  })}`;
  $("footAsOf").textContent = `Prices fetched ${stamp} from ${payload.source}`;
}

function versionOf(db) {
  try {
    return db.exec("SELECT sqlite_version();")[0].values[0][0];
  } catch { return "3.x"; }
}

/** Create the table and insert every row via a prepared statement. */
function seed(db, stocks) {
  db.run(`
    CREATE TABLE stocks (
      symbol       TEXT PRIMARY KEY,
      name         TEXT    NOT NULL,
      sector       TEXT    NOT NULL,
      price        REAL,
      change_1m    REAL,
      change_3m    REAL,
      change_1y    REAL,
      high_52w     REAL,
      low_52w      REAL,
      pct_off_high REAL,
      volatility   REAL,
      avg_volume   INTEGER,
      sma50        REAL,
      sma200       REAL
    );
    CREATE INDEX idx_sector ON stocks(sector);
    CREATE INDEX idx_change_1y ON stocks(change_1y);
  `);

  const cols = ["symbol", "name", "sector", "price", "change_1m", "change_3m",
    "change_1y", "high_52w", "low_52w", "pct_off_high", "volatility",
    "avg_volume", "sma50", "sma200"];
  const stmt = db.prepare(
    `INSERT INTO stocks (${cols.join(",")}) VALUES (${cols.map(() => "?").join(",")});`
  );
  db.run("BEGIN TRANSACTION;");
  for (const s of stocks) stmt.run(cols.map((c) => s[c] ?? null));
  db.run("COMMIT;");
  stmt.free();
}

function populateSectors(stocks) {
  const sel = $("fSector");
  [...new Set(stocks.map((s) => s.sector))].sort().forEach((sector) => {
    const opt = document.createElement("option");
    opt.value = opt.textContent = sector;
    sel.appendChild(opt);
  });
}

/* ── Sidebar: presets, columns, history, tabs ────────── */
function renderPresets() {
  $("presets").innerHTML = PRESETS.map((p, i) => `
    <li><button class="list-btn" type="button" data-preset="${i}">
      <span class="list-title">${escapeHtml(p.label)}</span>
      <span class="list-note">${escapeHtml(p.note)}</span>
    </button></li>`).join("");
}

function recordHistory(sql, rows) {
  const items = store.get(HISTORY_KEY, []).filter((h) => h.sql !== sql);
  items.unshift({ sql, rows, at: Date.now() });
  store.set(HISTORY_KEY, items.slice(0, HISTORY_MAX));
  renderHistory();
}

function renderHistory() {
  const items = store.get(HISTORY_KEY, []);
  $("clearHistoryBtn").hidden = !items.length;
  if (!items.length) {
    $("history").innerHTML = `<li class="empty-note">Queries you run with the Run button or a preset appear here.</li>`;
    return;
  }
  $("history").innerHTML = items.map((h, i) => `
    <li><button class="list-btn" type="button" data-history="${i}">
      <span class="list-code">${escapeHtml(h.sql.replace(/\s+/g, " "))}</span>
      <span class="list-note">${h.rows} row${h.rows === 1 ? "" : "s"} · ${timeAgo(h.at)}</span>
    </button></li>`).join("");
}

function timeAgo(t) {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
}

function initTabs() {
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  const select = (tab, focus) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      $(t.getAttribute("aria-controls")).hidden = !on;
    });
    if (tab.id === "tab-history") renderHistory();
    if (focus) tab.focus();
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => select(tab));
    tab.addEventListener("keydown", (e) => {
      const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
      if (next === undefined) return;
      e.preventDefault();
      select(tabs[(next + tabs.length) % tabs.length], true);
    });
  });
}

/* ── Ticker of the month's biggest movers ────────────── */
function renderTicker(stocks) {
  const movers = stocks.filter((s) => s.change_1m != null)
    .sort((a, b) => Math.abs(b.change_1m) - Math.abs(a.change_1m)).slice(0, 16);
  if (!movers.length) return;
  const item = (s, focusable) => `<li><button type="button" data-symbol="${s.symbol}"${focusable ? "" : ' tabindex="-1"'}
    aria-label="${escapeHtml(s.name)}, ${signed(s.change_1m, 1)} this month">
    <span class="t-sym">${s.symbol}</span><span class="chg ${trend(s.change_1m)}">${signed(s.change_1m, 1)}</span></button></li>`;
  $("tickerList").innerHTML = movers.map((s) => item(s, true)).join("");
  $("tickerClone").innerHTML = movers.map((s) => item(s, false)).join("");
  $("ticker").hidden = false;

  // Motion that runs longer than 5 seconds needs a way to stop it (WCAG 2.2.2).
  const pause = $("tickerPause");
  pause.addEventListener("click", () => {
    const paused = $("ticker").classList.toggle("paused");
    pause.lastChild.textContent = paused ? " Play" : " Pause";
  });
}

/* ── Filters → SQL ───────────────────────────────────── */
function buildSqlFromFilters() {
  const where = [];
  const sector = $("fSector").value;
  const pMin = $("fPriceMin").value;
  const pMax = $("fPriceMax").value;
  const ret = $("fRet1y").value;
  const vol = $("fVol").value;

  if (sector) where.push(`sector = '${sector.replace(/'/g, "''")}'`);
  if (pMin !== "") where.push(`price >= ${Number(pMin)}`);
  if (pMax !== "") where.push(`price <= ${Number(pMax)}`);
  if (ret !== "") where.push(`change_1y >= ${Number(ret)}`);
  if (vol !== "") where.push(`volatility <= ${Number(vol)}`);
  if ($("fAboveSma").checked) where.push(`price > sma200`);

  const sql =
    `SELECT symbol, name, sector, price, change_1m, change_1y, volatility, pct_off_high\n` +
    `FROM stocks\n` +
    (where.length ? `WHERE ${where.join("\n  AND ")}\n` : "") +
    `ORDER BY ${$("fSort").value};`;
  state.editor.setValue(sql);
  return sql;
}

/* ── Run ─────────────────────────────────────────────── */
function run({ record = false } = {}) {
  const sql = state.editor.value.trim();
  if (!sql) { setStatus("Nothing to run — write a query or pick a preset."); return; }
  if (!state.db) { setStatus("Database isn’t ready yet.", "err"); return; }

  const t0 = performance.now();
  let result;
  try {
    result = state.db.exec(sql);
  } catch (err) {
    // Keep the previous results on screen so a typo doesn't wipe your work.
    setStatus(`SQL error — ${err.message}`, "err");
    return;
  }
  const ms = performance.now() - t0;
  writeHash({ sql });

  if (!result.length) {
    state.columns = []; state.rows = [];
    renderTable([], []);
    $("resultCount").textContent = "";
    setStatus(`Query ran in ${ms.toFixed(1)} ms — no rows returned.`, "ok");
    if (record) recordHistory(sql, 0);
    return;
  }

  state.columns = result[0].columns;
  state.rows = result[0].values;
  renderTable(state.columns, state.rows);
  $("resultCount").textContent = `${state.rows.length}`;
  setStatus(`${state.rows.length} row${state.rows.length === 1 ? "" : "s"} in ${ms.toFixed(1)} ms`, "ok");
  if (record) recordHistory(sql, state.rows.length);
}

function renderTable(columns, rows, emptyMsg) {
  const thead = document.querySelector("#results thead");
  const tbody = document.querySelector("#results tbody");
  thead.innerHTML = "";
  tbody.innerHTML = "";

  if (!columns.length || !rows.length) {
    tbody.innerHTML = `<tr><td class="empty">${escapeHtml(emptyMsg ||
      "No rows matched. Loosen a filter, reset them, or edit the SQL.")}</td></tr>`;
    return;
  }

  const symIdx = columns.indexOf("symbol");
  const numeric = columns.map((_, i) => rows.some((r) => typeof r[i] === "number"));

  const tr = document.createElement("tr");
  columns.forEach((c, i) => {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = c.replace(/_/g, " ");
    if (numeric[i]) th.classList.add("num");
    if (i === symIdx) th.classList.add("sym");
    tr.appendChild(th);
  });
  thead.appendChild(tr);

  const frag = document.createDocumentFragment();
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    const sym = symIdx >= 0 ? row[symIdx] : null;
    if (sym && state.stocks.has(sym)) {
      tr.className = "clickable";
      tr.dataset.symbol = sym;
      if (sym === state.selected) tr.classList.add("selected");
    }
    row.forEach((val, i) => {
      const col = columns[i];
      const td = document.createElement("td");
      if (i === symIdx && tr.dataset.symbol) {
        td.className = "sym";
        const b = document.createElement("button");
        b.type = "button";
        b.className = "row-btn";
        b.dataset.symbol = sym;
        b.textContent = sym;
        b.setAttribute("aria-label", `${sym} — open details`);
        td.appendChild(b);
      } else {
        if (typeof val === "number") {
          td.className = "num";
          if (SIGNED.has(col) && val !== 0) td.classList.add(trend(val));
        } else td.className = i === symIdx ? "sym" : "txt";
        td.textContent = format(col, val);
      }
      tr.appendChild(td);
    });
    frag.appendChild(tr);
  });
  tbody.appendChild(frag);
}

/* ── CSV export ──────────────────────────────────────── */
function exportCsv() {
  if (!state.rows.length) { setStatus("Nothing to export yet."); return; }
  const esc = (v) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [state.columns.join(","), ...state.rows.map((r) => r.map(esc).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `screener-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  announce(`Exported ${state.rows.length} rows as CSV`);
}

/* ── Share link ──────────────────────────────────────── */
async function copyLink() {
  writeHash();
  const url = location.href;
  try {
    await navigator.clipboard.writeText(url);
  } catch {
    const t = document.createElement("textarea");
    t.value = url;
    t.setAttribute("readonly", "");
    t.style.position = "fixed"; t.style.opacity = "0";
    document.body.appendChild(t);
    t.select();
    document.execCommand("copy");
    t.remove();
  }
  announce("Link copied — it opens this exact query");
}

/* ── Theme ───────────────────────────────────────────── */
function initTheme() {
  const btn = $("themeBtn");
  const dark = () => (document.documentElement.dataset.theme ||
    (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")) === "dark";
  const label = () => btn.setAttribute("aria-label", dark() ? "Switch to paper edition" : "Switch to night edition");
  // Once the visitor picks an edition, the browser chrome colour should follow it, not the OS.
  const syncMeta = () => {
    if (!document.documentElement.dataset.theme) return;
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
      m.removeAttribute("media");
      m.content = dark() ? "#12110F" : "#F3EEE3";
    });
  };
  label();
  syncMeta();
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", label);
  btn.addEventListener("click", () => {
    const next = dark() ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    // Stored raw (not JSON) because the pre-paint script in <head> reads it directly.
    try { localStorage.setItem("theme", next); } catch {}
    label();
    syncMeta();
    if (state.selected) drawChart(state.selected);
  });
}

/* ── Detail drawer ───────────────────────────────────── */
function loadHistory() {
  if (!state.history) {
    state.history = fetch("data/history.json")
      .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .catch((err) => { state.history = null; throw err; });
  }
  return state.history;
}

function openDrawer(symbol) {
  const s = state.stocks.get(symbol);
  if (!s) return;
  if ($("drawer").hidden) state.lastFocus = document.activeElement;
  state.selected = symbol;

  $("drawerSym").textContent = symbol;
  $("drawerName").textContent = s.name;
  $("drawerSector").textContent = s.sector;
  $("drawerPrice").textContent = `$${s.price.toFixed(2)}`;
  const chg = $("drawerChg");
  chg.textContent = s.change_1y == null ? "" : signed(s.change_1y);
  chg.className = `chg ${trend(s.change_1y)}`;
  $("drawerAsof").textContent = "over 1 year";

  const lo = s.low_52w, hi = s.high_52w;
  const pos = lo != null && hi > lo ? Math.min(1, Math.max(0, (s.price - lo) / (hi - lo))) : 0.5;
  $("range52Dot").style.left = `${pos * 100}%`;
  $("range52Lo").textContent = lo != null ? `$${lo.toFixed(2)} low` : "—";
  $("range52Hi").textContent = hi != null ? `$${hi.toFixed(2)} high` : "—";

  const stat = (label, value, cls = "") => `<div class="stat"><dt>${label}</dt><dd class="${cls}">${value}</dd></div>`;
  const pct = (v) => (v == null ? "—" : signed(v));
  $("drawerStats").innerHTML = [
    stat("1-month", pct(s.change_1m), trend(s.change_1m)),
    stat("3-month", pct(s.change_3m), trend(s.change_3m)),
    stat("Volatility", s.volatility == null ? "—" : `${s.volatility.toFixed(1)}%`),
    stat("Below 52w high", pct(s.pct_off_high), trend(s.pct_off_high)),
    stat("50-day avg", s.sma50 == null ? "—" : `$${s.sma50.toFixed(2)}`),
    stat("200-day avg", s.sma200 == null ? "—" : `$${s.sma200.toFixed(2)}`),
    stat("Avg volume", s.avg_volume == null ? "—" : s.avg_volume.toLocaleString()),
    stat("Trend", s.sma200 == null ? "—" : s.price > s.sma200 ? "Above 200-day" : "Below 200-day"),
  ].join("");
  $("qSector").firstChild.textContent = `Compare with ${s.sector} `;

  document.querySelectorAll("#results tr.selected").forEach((tr) => tr.classList.remove("selected"));
  document.querySelector(`#results tr[data-symbol="${CSS.escape(symbol)}"]`)?.classList.add("selected");

  if ($("drawer").hidden) {
    $("drawerBackdrop").hidden = false;
    $("drawer").hidden = false;
    ["main", "header", "footer"].forEach((sel) => document.querySelector(sel).inert = true);
    document.body.style.overflow = "hidden";
    $("drawer").scrollTop = 0;
    $("drawerClose").focus();
  }
  writeHash({ stock: symbol });
  drawChart(symbol);
}

function drawChart(symbol) {
  const fig = $("chart");
  fig.querySelectorAll("svg, .chart-tip, .empty").forEach((n) => n.remove());
  const msg = document.createElement("p");
  msg.className = "empty";
  msg.textContent = "Loading chart…";
  fig.appendChild(msg);

  loadHistory().then((h) => {
    if (state.selected !== symbol) return;
    msg.remove();
    const closes = h.closes[symbol];
    if (!closes || closes.filter((v) => v != null).length < 2) {
      msg.textContent = "No price history for this stock yet.";
      fig.appendChild(msg);
      return;
    }
    const { summary } = StockChart.render(fig, { dates: h.dates, closes, days: state.chartDays, symbol });
    $("chartCaption").textContent = summary;
  }).catch(() => {
    msg.textContent = "The price chart couldn’t load. The stats below are still current.";
  });
}

function closeDrawer() {
  if ($("drawer").hidden) return;
  $("drawer").hidden = true;
  $("drawerBackdrop").hidden = true;
  ["main", "header", "footer"].forEach((sel) => document.querySelector(sel).inert = false);
  document.body.style.overflow = "";
  document.querySelectorAll("#results tr.selected").forEach((tr) => tr.classList.remove("selected"));
  state.selected = null;
  writeHash({ stock: null });
  const back = state.lastFocus;
  if (back && document.contains(back)) back.focus();
}

function queryFromDrawer(sql) {
  closeDrawer();
  state.editor.setValue(sql);
  run({ record: true });
  $("resultsHeading").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
}

/* ── Events ──────────────────────────────────────────── */
function wireEvents() {
  let timer;
  ["fSector", "fAboveSma", "fSort"].forEach((id) =>
    $(id).addEventListener("change", () => { buildSqlFromFilters(); run(); }));
  ["fPriceMin", "fPriceMax", "fRet1y", "fVol"].forEach((id) =>
    $(id).addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(() => { buildSqlFromFilters(); run(); }, 300);
    }));

  $("runBtn").addEventListener("click", () => run({ record: true }));
  $("csvBtn").addEventListener("click", exportCsv);
  $("shareBtn").addEventListener("click", copyLink);

  $("resetBtn").addEventListener("click", () => {
    ["fPriceMin", "fPriceMax", "fRet1y", "fVol"].forEach((id) => ($(id).value = ""));
    $("fSector").value = "";
    $("fAboveSma").checked = false;
    $("fSort").value = "change_1y DESC";
    buildSqlFromFilters();
    run();
  });

  $("presets").addEventListener("click", (e) => {
    const b = e.target.closest("[data-preset]");
    if (!b) return;
    state.editor.setValue(PRESETS[b.dataset.preset].sql);
    run({ record: true });
  });
  $("columns").addEventListener("click", (e) => {
    const b = e.target.closest("[data-col]");
    if (!b) return;
    state.editor.insert(b.dataset.col);
    announce(`Inserted ${b.dataset.col}`, false);
  });
  $("history").addEventListener("click", (e) => {
    const b = e.target.closest("[data-history]");
    if (!b) return;
    const item = store.get(HISTORY_KEY, [])[b.dataset.history];
    if (!item) return;
    state.editor.setValue(item.sql);
    run({ record: true });
  });
  $("clearHistoryBtn").addEventListener("click", () => {
    store.set(HISTORY_KEY, []);
    renderHistory();
    announce("Query history cleared");
  });

  // Rows and ticker items open the detail drawer.
  document.querySelector("#results tbody").addEventListener("click", (e) => {
    const tr = e.target.closest("tr[data-symbol]");
    if (tr) openDrawer(tr.dataset.symbol);
  });
  $("ticker").addEventListener("click", (e) => {
    const b = e.target.closest("[data-symbol]");
    if (b) openDrawer(b.dataset.symbol);
  });

  $("drawerClose").addEventListener("click", closeDrawer);
  $("drawerBackdrop").addEventListener("click", closeDrawer);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !$("drawer").hidden) closeDrawer();
  });
  document.querySelector(".range-toggle").addEventListener("click", (e) => {
    const b = e.target.closest("[data-range]");
    if (!b) return;
    state.chartDays = Number(b.dataset.range);
    document.querySelectorAll(".range-toggle button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    if (state.selected) drawChart(state.selected);
  });
  $("qSector").addEventListener("click", () => {
    const s = state.stocks.get(state.selected);
    queryFromDrawer(`SELECT symbol, name, price, change_1y, volatility, pct_off_high\nFROM stocks\nWHERE sector = '${s.sector.replace(/'/g, "''")}'\nORDER BY change_1y DESC;`);
  });
  $("qSimilar").addEventListener("click", () => {
    const s = state.stocks.get(state.selected);
    const v = s.volatility;
    queryFromDrawer(`SELECT symbol, name, sector, price, volatility, change_1y\nFROM stocks\nWHERE volatility BETWEEN ${(v * 0.85).toFixed(1)} AND ${(v * 1.15).toFixed(1)}\n  AND symbol <> '${s.symbol}'\nORDER BY ABS(volatility - ${v}) ASC;`);
  });

  window.addEventListener("hashchange", () => {
    const { sql, stock } = readHash();
    if (sql && sql !== state.editor.value) { state.editor.setValue(sql); run(); }
    if (stock && stock !== state.selected && state.stocks.has(stock)) openDrawer(stock);
  });
}

boot();
