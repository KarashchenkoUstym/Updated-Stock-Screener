/**
 * Hand-rolled SVG price chart: close, 50- and 200-day moving averages, a hover/keyboard cursor.
 * No chart library — the whole thing is a few paths, which keeps the site dependency-free.
 */
(function () {
  const W = 440, H = 240;
  const PAD = { top: 14, right: 54, bottom: 26, left: 6 };
  const NS = "http://www.w3.org/2000/svg";
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  function sma(values, n) {
    const out = new Array(values.length).fill(null);
    let sum = 0, count = 0;
    for (let i = 0; i < values.length; i++) {
      if (values[i] != null) { sum += values[i]; count++; }
      if (i >= n && values[i - n] != null) { sum -= values[i - n]; count--; }
      if (i >= n - 1 && count === n) out[i] = sum / n;
    }
    return out;
  }

  function niceTicks(min, max, count = 5) {
    const span = max - min || 1;
    const raw = span / count;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw);
    const ticks = [];
    for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) ticks.push(v);
    return ticks;
  }

  const el = (name, attrs = {}) => {
    const node = document.createElementNS(NS, name);
    for (const k in attrs) node.setAttribute(k, attrs[k]);
    return node;
  };

  function pathFor(values, x, y) {
    let d = "", pen = false;
    values.forEach((v, i) => {
      if (v == null) { pen = false; return; }
      d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
      pen = true;
    });
    return d;
  }

  const fmtDate = (iso, withYear) => {
    const [yy, mm, dd] = iso.split("-").map(Number);
    return `${dd} ${MONTHS[mm - 1]}${withYear ? " " + yy : ""}`;
  };

  function render(figure, { dates, closes, days = 0, symbol }) {
    figure.querySelectorAll("svg, .chart-tip").forEach((n) => n.remove());

    const s50 = sma(closes, 50);
    const s200 = sma(closes, 200);
    const from = days > 0 ? Math.max(0, closes.length - days) : 0;
    const d = dates.slice(from), c = closes.slice(from), a = s50.slice(from), b = s200.slice(from);

    const visible = [...c, ...a, ...b].filter((v) => v != null);
    let lo = Math.min(...visible), hi = Math.max(...visible);
    const pad = (hi - lo) * 0.06 || hi * 0.02;
    lo -= pad; hi += pad;

    const x = (i) => PAD.left + (i / Math.max(1, c.length - 1)) * (W - PAD.left - PAD.right);
    const y = (v) => PAD.top + (1 - (v - lo) / (hi - lo)) * (H - PAD.top - PAD.bottom);
    const baseY = H - PAD.bottom;

    const first = c.find((v) => v != null), last = [...c].reverse().find((v) => v != null);
    const change = ((last - first) / first) * 100;
    const summary = `${symbol} closing price from ${fmtDate(d[0], true)} to ${fmtDate(d[d.length - 1], true)}: ` +
      `${first.toFixed(2)} to ${last.toFixed(2)} dollars, ${change >= 0 ? "up" : "down"} ${Math.abs(change).toFixed(1)}%.`;

    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", tabindex: "0", "aria-label": summary });

    // Grid + y axis on the right, like a printed chart.
    const grid = el("g", { class: "grid" });
    const axis = el("g", { class: "axis" });
    for (const t of niceTicks(lo, hi)) {
      grid.appendChild(el("line", { x1: PAD.left, x2: W - PAD.right, y1: y(t), y2: y(t) }));
      const label = el("text", { x: W - PAD.right + 8, y: y(t) + 4 });
      label.textContent = t >= 1000 ? t.toFixed(0) : t % 1 ? t.toFixed(1) : t.toFixed(0);
      axis.appendChild(label);
    }
    // x labels: ~4 evenly spaced dates.
    const n = Math.min(4, d.length);
    for (let k = 0; k < n; k++) {
      const i = Math.round((k / Math.max(1, n - 1)) * (d.length - 1));
      const label = el("text", { x: x(i), y: H - 6, "text-anchor": k === 0 ? "start" : k === n - 1 ? "end" : "middle" });
      label.textContent = fmtDate(d[i], false);
      axis.appendChild(label);
    }
    svg.append(grid, axis);

    const pricePath = pathFor(c, x, y);
    const firstI = c.findIndex((v) => v != null);
    svg.appendChild(el("path", { class: "l-area", d: `${pricePath}L${x(c.length - 1)},${baseY}L${x(firstI)},${baseY}Z` }));
    svg.appendChild(el("path", { class: "l-sma200", d: pathFor(b, x, y) }));
    svg.appendChild(el("path", { class: "l-sma50", d: pathFor(a, x, y) }));
    const price = el("path", { class: "l-price", d: pricePath });
    svg.appendChild(price);

    const cursor = el("g", { class: "cursor", visibility: "hidden" });
    const cLine = el("line", { y1: PAD.top, y2: baseY });
    const cDot = el("circle", { r: 4 });
    cursor.append(cLine, cDot);
    svg.appendChild(cursor);

    const tip = document.createElement("div");
    tip.className = "chart-tip";
    tip.hidden = true;
    figure.append(svg, tip);

    let idx = c.length - 1;
    function show(i) {
      idx = Math.max(0, Math.min(c.length - 1, i));
      if (c[idx] == null) return;
      const px = x(idx), py = y(c[idx]);
      cLine.setAttribute("x1", px); cLine.setAttribute("x2", px);
      cDot.setAttribute("cx", px); cDot.setAttribute("cy", py);
      cursor.setAttribute("visibility", "visible");
      tip.hidden = false;
      tip.textContent = `${fmtDate(d[idx], true)} · $${c[idx].toFixed(2)}`;
      const rect = svg.getBoundingClientRect();
      const left = (px / W) * rect.width;
      tip.style.left = Math.max(70, Math.min(rect.width - 70, left)) + "px";
      tip.style.top = "-8px";
    }
    function hide() { cursor.setAttribute("visibility", "hidden"); tip.hidden = true; }

    svg.addEventListener("pointermove", (e) => {
      const rect = svg.getBoundingClientRect();
      const vx = ((e.clientX - rect.left) / rect.width) * W;
      show(Math.round(((vx - PAD.left) / (W - PAD.left - PAD.right)) * (c.length - 1)));
    });
    svg.addEventListener("pointerleave", hide);
    svg.addEventListener("blur", hide);
    svg.addEventListener("keydown", (e) => {
      const step = e.shiftKey ? 10 : 1;
      if (e.key === "ArrowLeft") { e.preventDefault(); show(idx - step); }
      else if (e.key === "ArrowRight") { e.preventDefault(); show(idx + step); }
      else if (e.key === "Home") { e.preventDefault(); show(0); }
      else if (e.key === "End") { e.preventDefault(); show(c.length - 1); }
    });

    // Draw the price line in, unless the visitor prefers reduced motion.
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches && price.getTotalLength) {
      const len = price.getTotalLength();
      price.style.strokeDasharray = len;
      price.style.strokeDashoffset = len;
      price.getBoundingClientRect();
      price.style.transition = "stroke-dashoffset .7s cubic-bezier(.2,.8,.2,1)";
      price.style.strokeDashoffset = "0";
    }

    return { summary, change };
  }

  window.StockChart = { render, sma };
})();
