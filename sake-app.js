// Sake cheat sheet — app logic (simplified: just tabs + paragraph text)
(function () {
  const C = window.SAKE_CONTENT;
  const BODY = window.SAKE_BODY || {};
  if (!C) { console.error('SAKE_CONTENT missing'); return; }

  const state = {
    focusedRow: 'r1',
    active: { r1: 0, r2: 0 }
  };

  function buildTabs(rowEl, rowKey) {
    const strip = rowEl.querySelector('[data-tabs]');
    const data = C[rowKey];
    strip.innerHTML = '';
    data.topics.forEach((t, i) => {
      const btn = document.createElement('button');
      btn.className = 'tab' + (i === state.active[rowKey] ? ' active' : '');
      btn.dataset.idx = i;
      btn.textContent = t.title;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        state.active[rowKey] = i;
        state.focusedRow = rowKey;
        render();
      });
      strip.appendChild(btn);
    });

    if (rowEl.dataset.label) {
      const label = document.createElement('span');
      label.className = 'row-label';
      label.textContent = rowEl.dataset.label;
      strip.appendChild(label);
    }
  }

  function buildPanel(rowEl, rowKey) {
    const panel = rowEl.querySelector('[data-panel]');
    const data = C[rowKey];
    const idx = state.active[rowKey];
    const t = data.topics[idx];
    const paragraphs = BODY[t.id] || ["[Add content for this topic.]"];

    panel.innerHTML = `
      <div class="panel-inner">
        <h2 class="topic-title">${t.title}</h2>
        <div class="topic-text">
          ${paragraphs.map(p => `<p>${p}</p>`).join('')}
        </div>
      </div>
    `;
  }

  function applyFocus() {
    document.querySelectorAll('.row').forEach(r => {
      const k = r.dataset.row;
      r.classList.toggle('focused', k === state.focusedRow);
    });
  }

  function render() {
    document.querySelectorAll('.row').forEach(r => {
      const k = r.dataset.row;
      buildTabs(r, k);
      buildPanel(r, k);
    });
    applyFocus();
  }

  function bind() {
    document.querySelectorAll('.row').forEach(r => {
      const k = r.dataset.row;
      r.addEventListener('click', () => {
        if (state.focusedRow !== k) {
          state.focusedRow = k;
          applyFocus();
        }
      });
    });

    document.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT') return;
      const k = state.focusedRow;
      const total = C[k].topics.length;
      if (e.key === 'ArrowRight') {
        state.active[k] = (state.active[k] + 1) % total;
        render();
      } else if (e.key === 'ArrowLeft') {
        state.active[k] = (state.active[k] - 1 + total) % total;
        render();
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        state.focusedRow = (state.focusedRow === 'r1') ? 'r2' : 'r1';
        applyFocus();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    render();
    bind();
  });

  window.SAKE_APP = { state, render };
})();
