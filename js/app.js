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

const $ = (id) => document.getElementById(id);
const state = { db: null, columns: [], rows: [] };

function setStatus(msg, kind = "") {
  const el = $("status");
  el.textContent = msg;
  el.className = "status" + (kind ? " " + kind : "");
}

/* ── Boot ────────────────────────────────────────────── */
async function boot() {
  try {
    const SQL = await initSqlJs({ locateFile: () => "vendor/sql-wasm.wasm" });

    const res = await fetch("data/stocks.json");
    if (!res.ok) throw new Error(`could not load data/stocks.json (${res.status})`);
    const payload = await res.json();

    state.db = new SQL.Database();
    seed(state.db, payload.stocks);

    $("engineBadge").textContent = `SQLite ${versionOf(state.db)} · WASM`;
    $("engineBadge").className = "badge ready";
    showProvenance(payload);

    populateSectors(payload.stocks);
    renderPresets();
    wireEvents();

    buildSqlFromFilters();
    run();
  } catch (err) {
    $("engineBadge").textContent = "failed to start";
    $("engineBadge").className = "badge error";
    setStatus(String(err && err.message || err), "err");
  }
}

/** Surface exactly how old the data is, in the header badge and the footer. */
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
  badge.textContent = `${payload.count} stocks · real prices · ${age}`;
  badge.title = `Fetched ${stamp} from ${payload.source}`;
  // Nudge the badge amber once the snapshot is over a week old.
  if (hours > 168) badge.classList.add("stale");

  const set = (id, text) => { const el = $(id); if (el) el.textContent = text; };
  set("footCount", payload.count);
  set("footAsOf", stamp);
  set("footAge", age);
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

function renderPresets() {
  const wrap = $("presets");
  PRESETS.forEach((p) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "preset";
    b.innerHTML = `${escapeHtml(p.label)}<small>${escapeHtml(p.note)}</small>`;
    b.addEventListener("click", () => { $("sql").value = p.sql; run(); });
    wrap.appendChild(b);
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
  $("sql").value = sql;
  return sql;
}

/* ── Run ─────────────────────────────────────────────── */
function run() {
  const sql = $("sql").value.trim();
  if (!sql) { setStatus("Nothing to run."); return; }
  if (!state.db) { setStatus("Database isn't ready yet.", "err"); return; }

  const t0 = performance.now();
  let result;
  try {
    result = state.db.exec(sql);
  } catch (err) {
    setStatus(`SQL error — ${err.message}`, "err");
    return;
  }
  const ms = performance.now() - t0;

  if (!result.length) {
    state.columns = []; state.rows = [];
    renderTable([], []);
    $("resultCount").textContent = "Results";
    setStatus(`Query ran in ${ms.toFixed(1)} ms — no rows returned.`, "ok");
    return;
  }

  state.columns = result[0].columns;
  state.rows = result[0].values;
  renderTable(state.columns, state.rows);
  $("resultCount").textContent = `Results — ${state.rows.length}`;
  setStatus(`${state.rows.length} row${state.rows.length === 1 ? "" : "s"} in ${ms.toFixed(1)} ms`, "ok");
}

function renderTable(columns, rows) {
  const thead = document.querySelector("#results thead");
  const tbody = document.querySelector("#results tbody");
  thead.innerHTML = "";
  tbody.innerHTML = "";

  if (!columns.length) {
    tbody.innerHTML = `<tr><td class="empty">No rows matched. Loosen a filter or edit the SQL.</td></tr>`;
    return;
  }

  const tr = document.createElement("tr");
  columns.forEach((c) => {
    const th = document.createElement("th");
    th.textContent = c;
    tr.appendChild(th);
  });
  thead.appendChild(tr);

  const frag = document.createDocumentFragment();
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    row.forEach((val, i) => {
      const col = columns[i];
      const td = document.createElement("td");
      if (col === "symbol") td.className = "sym";
      else if (typeof val === "number") {
        td.className = "num";
        if (SIGNED.has(col) && val !== 0) td.classList.add(val > 0 ? "up" : "down");
      }
      td.textContent = format(col, val);
      tr.appendChild(td);
    });
    frag.appendChild(tr);
  });
  tbody.appendChild(frag);
}

function format(col, val) {
  if (val === null || val === undefined) return "—";
  if (typeof val !== "number") return String(val);
  if (col === "avg_volume") return val.toLocaleString();
  if (SIGNED.has(col)) return `${val > 0 ? "+" : ""}${val.toFixed(2)}%`;
  if (col === "volatility") return `${val.toFixed(2)}%`;
  if (NUMERIC.has(col)) return val.toFixed(2);
  return Number.isInteger(val) ? String(val) : val.toFixed(2);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
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
}

/* ── Events ──────────────────────────────────────────── */
function wireEvents() {
  ["fSector", "fPriceMin", "fPriceMax", "fRet1y", "fVol", "fAboveSma", "fSort"]
    .forEach((id) => $(id).addEventListener("change", () => { buildSqlFromFilters(); run(); }));

  $("runBtn").addEventListener("click", run);
  $("csvBtn").addEventListener("click", exportCsv);

  $("resetBtn").addEventListener("click", () => {
    ["fPriceMin", "fPriceMax", "fRet1y", "fVol"].forEach((id) => ($(id).value = ""));
    $("fSector").value = "";
    $("fAboveSma").checked = false;
    $("fSort").value = "change_1y DESC";
    buildSqlFromFilters();
    run();
  });

  $("sql").addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); run(); }
  });
}

boot();
