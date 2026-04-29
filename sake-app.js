// Sake cheat sheet — app logic (simplified: just tabs + paragraph text)
(function () {
  const C = window.SAKE_CONTENT;
  const BODY = window.SAKE_BODY || {};
  if (!C) {
    console.error("SAKE_CONTENT missing");
    return;
  }

  const state = {
    focusedRow: "r1",
    active: { r1: 0, r2: 0 },
  };

  let zoom = { scale: 1, tx: 0, ty: 0 };
  let isPanning = false;
  const ZOOM_MIN = 1;
  const ZOOM_MAX = 3;

  function applyZoom() {
    const inner = document.getElementById("visual-inner");
    if (inner) {
      inner.style.transformOrigin = "0 0";
      inner.style.transform = `translate(${zoom.tx}px, ${zoom.ty}px) scale(${zoom.scale})`;
    }
    const visual = document.getElementById("visual");
    if (visual) {
      visual.style.cursor = isPanning ? "grabbing" : zoom.scale > 1 ? "grab" : "";
    }
  }

  function resetZoom() {
    zoom = { scale: 1, tx: 0, ty: 0 };
    applyZoom();
  }

  function buildTabs(rowEl, rowKey) {
    const strip = rowEl.querySelector("[data-tabs]");
    const data = C[rowKey];
    strip.innerHTML = "";
    data.topics.forEach((t, i) => {
      const btn = document.createElement("button");
      btn.className = "tab" + (i === state.active[rowKey] ? " active" : "");
      btn.dataset.idx = i;
      btn.textContent = t.title;
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        state.active[rowKey] = i;
        state.focusedRow = rowKey;
        updateVisual(true);
        render();
      });
      strip.appendChild(btn);
    });

    if (rowEl.dataset.label) {
      const label = document.createElement("span");
      label.className = "row-label";
      label.textContent = rowEl.dataset.label;
      strip.appendChild(label);
    }
  }

  function buildPanel(rowEl, rowKey) {
    const panel = rowEl.querySelector("[data-panel]");
    const data = C[rowKey];
    const idx = state.active[rowKey];
    const t = data.topics[idx];
    const paragraphs = BODY[t.id] || ["[Add content for this topic.]"];

    panel.innerHTML = `
      <div class="panel-inner">
        <h2 class="topic-title">${t.title}</h2>
        <div class="topic-text">
          ${paragraphs.map((p) => `<p>${p}</p>`).join("")}
        </div>
      </div>
    `;
  }

  function applyFocus() {
    document.querySelectorAll(".row").forEach((r) => {
      const k = r.dataset.row;
      r.classList.toggle("focused", k === state.focusedRow);
    });
  }

  function render() {
    document.querySelectorAll(".row").forEach((r) => {
      const k = r.dataset.row;
      buildTabs(r, k);
      buildPanel(r, k);
    });
    applyFocus();
  }

  // ── Visual panel ─────────────────────────────────────────────

  function getActiveTopic() {
    const k = state.focusedRow;
    return C[k].topics[state.active[k]];
  }

  function applyVisualContent(topic) {
    const content = document.getElementById("visual-content");
    const imgs = [].concat(topic.img || []).filter(Boolean);
    const captions = [].concat(topic.caption || []);

    if (imgs.length === 0) {
      content.className = "visual-content";
      content.innerHTML = `
        <div class="visual-placeholder">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
          <span>Image coming soon</span>
        </div>
      `;
      return;
    }

    content.className = "visual-content";
    content.innerHTML = imgs.map((src, i) => `
      <figure class="visual-figure">
        <img class="visual-img" src="${src}" alt="${topic.title}">
        ${captions[i] ? `<figcaption class="visual-caption">${captions[i]}</figcaption>` : ""}
      </figure>
    `).join("");
  }

  function updateVisual(animate) {
    resetZoom();
    const topic = getActiveTopic();
    if (!animate) {
      applyVisualContent(topic);
      return;
    }
    const inner = document.getElementById("visual-inner");
    inner.classList.add("fading");
    setTimeout(() => {
      applyVisualContent(topic);
      inner.classList.remove("fading");
    }, 200);
  }

  function buildVisual() {
    const visual = document.getElementById("visual");
    visual.innerHTML = `
      <button id="zoom-reset" class="zoom-reset">Reset</button>
      <div id="visual-inner" class="visual-inner">
        <div id="visual-content" class="visual-content"></div>
      </div>
    `;
    document.getElementById("zoom-reset").addEventListener("click", resetZoom);
  }

  function bindTheme() {
    const input = document.getElementById("theme-toggle-input");
    if (!input) return;
    input.addEventListener("change", () => {
      document.documentElement.dataset.theme = input.checked ? "light" : "";
    });
  }

  // ── Bind ──────────────────────────────────────────────────────

  function bindPan() {
    const visual = document.getElementById("visual");
    let lastX = 0, lastY = 0;

    visual.addEventListener("mousedown", (e) => {
      if (zoom.scale <= 1) return;
      isPanning = true;
      lastX = e.clientX;
      lastY = e.clientY;
      applyZoom();
      e.preventDefault();
    });

    document.addEventListener("mousemove", (e) => {
      if (!isPanning) return;
      zoom.tx += e.clientX - lastX;
      zoom.ty += e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      applyZoom();
    });

    document.addEventListener("mouseup", () => {
      if (!isPanning) return;
      isPanning = false;
      applyZoom();
    });
  }

  function bindZoom() {
    const visual = document.getElementById("visual");
    visual.addEventListener("wheel", (e) => {
      e.preventDefault();
      const rect = visual.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      const newScale = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom.scale * factor));
      const ratio = newScale / zoom.scale;

      zoom.tx = mx + (zoom.tx - mx) * ratio;
      zoom.ty = my + (zoom.ty - my) * ratio;
      zoom.scale = newScale;

      applyZoom();
    }, { passive: false });
  }

  function bind() {
    document.querySelectorAll(".row").forEach((r) => {
      const k = r.dataset.row;
      r.addEventListener("click", () => {
        if (state.focusedRow !== k) {
          state.focusedRow = k;
          applyFocus();
          updateVisual(true);
        }
      });
    });

    document.addEventListener("keydown", (e) => {
      if (e.target.tagName === "INPUT") return;
      const k = state.focusedRow;
      const total = C[k].topics.length;
      if (e.key === "ArrowRight") {
        state.active[k] = (state.active[k] + 1) % total;
        render();
        updateVisual(true);
      } else if (e.key === "ArrowLeft") {
        state.active[k] = (state.active[k] - 1 + total) % total;
        render();
        updateVisual(true);
      } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        state.focusedRow = state.focusedRow === "r1" ? "r2" : "r1";
        applyFocus();
        updateVisual(true);
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    buildVisual();
    render();
    updateVisual(false);
    bind();
    bindZoom();
    bindPan();
    bindTheme();
  });

  window.SAKE_APP = { state, render };
})();
