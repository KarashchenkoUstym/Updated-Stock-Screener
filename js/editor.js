/**
 * A dependency-free SQL editor: a transparent <textarea> laid over a highlighted <pre>.
 * Typing stays native (undo, IME, mobile keyboards, screen readers); the <pre> only paints colour.
 * Adds column/keyword autocomplete as an ARIA combobox.
 */
(function () {
  const KEYWORDS = `SELECT FROM WHERE AND OR NOT IN IS NULL LIKE GLOB BETWEEN ORDER BY GROUP HAVING LIMIT
    OFFSET AS ASC DESC DISTINCT CASE WHEN THEN ELSE END JOIN LEFT INNER OUTER CROSS ON USING UNION ALL
    EXCEPT INTERSECT WITH EXISTS CAST COLLATE NOCASE TRUE FALSE INTEGER REAL TEXT OVER PARTITION`.split(/\s+/);
  const FUNCTIONS = `COUNT SUM AVG MIN MAX ROUND ABS LENGTH LOWER UPPER SUBSTR COALESCE IFNULL NULLIF PRINTF
    TRIM REPLACE INSTR TOTAL GROUP_CONCAT ROW_NUMBER RANK DENSE_RANK NTILE LAG LEAD PERCENT_RANK`.split(/\s+/);
  const KW = new Set(KEYWORDS);
  const FN = new Set(FUNCTIONS);

  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const span = (cls, text) => `<span class="${cls}">${esc(text)}</span>`;

  /** Single-pass scanner — good enough for highlighting, never used for parsing. */
  function highlight(src, columns) {
    const re = /(--[^\n]*|\/\*[\s\S]*?(?:\*\/|$))|('(?:[^']|'')*'?)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][A-Za-z0-9_]*)|([\s\S])/g;
    let out = "";
    let m;
    while ((m = re.exec(src))) {
      const [tok, com, str, num, word] = m;
      if (com) out += span("tok-com", com);
      else if (str) out += span("tok-str", str);
      else if (num) out += span("tok-num", num);
      else if (word) {
        const up = word.toUpperCase();
        const isCall = src[re.lastIndex] === "(";
        if (FN.has(up) && isCall) out += span("tok-fn", word);
        else if (KW.has(up)) out += span("tok-kw", word);
        else if (columns.has(word.toLowerCase())) out += span("tok-col", word);
        else out += esc(word);
      } else out += esc(tok);
    }
    return out;
  }

  function attach({ input, pre, menu, columns, onRun, onChange }) {
    const colNames = new Set(columns.map((c) => c.name));
    const code = pre.querySelector("code");
    let items = [];
    let active = 0;
    let mirror = null;

    const suggestions = [
      ...columns.map((c) => ({ label: c.name, kind: "column" })),
      { label: "stocks", kind: "table" },
      ...FUNCTIONS.map((f) => ({ label: f, kind: "function", insert: f + "(" })),
      ...KEYWORDS.map((k) => ({ label: k, kind: "keyword" })),
    ];

    function render() {
      // A trailing newline needs a character after it or the <pre> is one line short.
      code.innerHTML = highlight(input.value, colNames) + (input.value.endsWith("\n") ? " " : "");
      syncScroll();
    }
    function syncScroll() {
      pre.scrollTop = input.scrollTop;
      pre.scrollLeft = input.scrollLeft;
    }

    function currentWord() {
      const upto = input.value.slice(0, input.selectionStart);
      const m = /[A-Za-z_][A-Za-z0-9_]*$/.exec(upto);
      return m ? { text: m[0], start: input.selectionStart - m[0].length } : { text: "", start: input.selectionStart };
    }

    /** Pixel position of the caret inside the textarea, via an off-screen mirror element. */
    function caretXY() {
      if (!mirror) {
        mirror = document.createElement("div");
        document.body.appendChild(mirror);
      }
      const cs = getComputedStyle(input);
      for (const p of ["fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "paddingTop",
        "paddingRight", "paddingBottom", "paddingLeft", "borderTopWidth", "borderLeftWidth", "boxSizing", "tabSize"]) {
        mirror.style[p] = cs[p];
      }
      Object.assign(mirror.style, {
        position: "absolute", visibility: "hidden", top: "0", left: "-9999px",
        whiteSpace: "pre-wrap", overflowWrap: "anywhere", width: input.clientWidth + "px",
      });
      mirror.textContent = input.value.slice(0, input.selectionStart);
      const marker = document.createElement("span");
      marker.textContent = "​";
      mirror.appendChild(marker);
      return {
        x: marker.offsetLeft - input.scrollLeft,
        y: marker.offsetTop - input.scrollTop + parseFloat(cs.lineHeight),
      };
    }

    function open(force) {
      const { text } = currentWord();
      if (!text && !force) return close();
      const q = text.toLowerCase();
      items = suggestions
        .filter((s) => s.label.toLowerCase().startsWith(q) && s.label.toLowerCase() !== q)
        .slice(0, 8);
      if (!items.length) return close();
      active = 0;
      menu.innerHTML = items.map((s, i) =>
        `<li role="option" id="ac-${i}" aria-selected="${i === 0}"><span>${esc(s.label)}</span><span class="ac-kind">${s.kind}</span></li>`
      ).join("");
      const { x, y } = caretXY();
      const maxX = input.clientWidth - 250;
      menu.style.left = Math.max(8, Math.min(x, maxX)) + "px";
      menu.style.top = y + 4 + "px";
      menu.hidden = false;
      input.setAttribute("aria-activedescendant", "ac-0");
    }
    function close() {
      menu.hidden = true;
      items = [];
      input.removeAttribute("aria-activedescendant");
    }
    function move(delta) {
      active = (active + delta + items.length) % items.length;
      [...menu.children].forEach((li, i) => li.setAttribute("aria-selected", String(i === active)));
      input.setAttribute("aria-activedescendant", "ac-" + active);
      menu.children[active].scrollIntoView({ block: "nearest" });
    }
    function accept(i = active) {
      const s = items[i];
      if (!s) return;
      const { start } = currentWord();
      replaceRange(start, input.selectionStart, s.insert || s.label);
      close();
    }

    /** Edit through execCommand where supported so native undo keeps working. */
    function replaceRange(from, to, text) {
      input.focus();
      input.setSelectionRange(from, to);
      if (!document.execCommand || !document.execCommand("insertText", false, text)) {
        input.setRangeText(text, from, to, "end");
        input.dispatchEvent(new Event("input"));
      }
    }

    function insert(text) {
      const pos = input.selectionStart ?? input.value.length;
      const before = input.value[pos - 1];
      const pad = before && !/[\s(,]/.test(before) ? " " : "";
      replaceRange(pos, input.selectionEnd ?? pos, pad + text);
    }

    input.addEventListener("input", () => {
      render();
      if (!menu.hidden || currentWord().text.length >= 2) open(false);
      onChange && onChange(input.value);
    });
    input.addEventListener("scroll", syncScroll);
    input.addEventListener("blur", () => setTimeout(close, 120));
    input.addEventListener("click", close);
    new ResizeObserver(syncScroll).observe(input);

    input.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault(); close(); onRun && onRun(); return;
      }
      if (e.ctrlKey && (e.key === " " || e.code === "Space")) { e.preventDefault(); open(true); return; }
      if (menu.hidden) return;
      if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
      else if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); accept(); }
      else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); }
    });
    menu.addEventListener("mousedown", (e) => {
      const li = e.target.closest("li");
      if (!li) return;
      e.preventDefault();
      accept([...menu.children].indexOf(li));
    });

    render();
    return {
      get value() { return input.value; },
      setValue(v) { input.value = v; render(); close(); },
      insert,
      focus() { input.focus(); },
    };
  }

  window.SqlEditor = { attach, highlight };
})();
