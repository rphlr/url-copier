// Draggable 3-state theme pill (light / dark / system) with a sliding gradient
// thumb — a vanilla port of the template's ThemeSelector. Shared by the popup
// and the options page. Build it into a container with:
//   const pill = URLCopierThemePill.init(el, { value, titles, onChange });
// and keep it in sync with `pill.set(value)` / `pill.setTitles(titles)`.
(function () {
  'use strict';

  const MODES = ['light', 'dark', 'system'];

  // Build icons with createElementNS — the reliable way to inject inline SVG
  // (Firefox does not lay out an <svg> imported from a parsed XML document).
  const SVG_NS = 'http://www.w3.org/2000/svg';

  function svgEl(name, attrs, children) {
    const node = document.createElementNS(SVG_NS, name);
    Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
    (children || []).forEach((c) => node.appendChild(c));
    return node;
  }

  function icon(mode) {
    const base = {
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '1.9',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round'
    };
    if (mode === 'light') {
      return svgEl('svg', base, [
        svgEl('circle', { cx: 12, cy: 12, r: 4 }),
        svgEl('path', {
          d: 'M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41'
        })
      ]);
    }
    if (mode === 'dark') {
      return svgEl('svg', base, [
        svgEl('path', { d: 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z' })
      ]);
    }
    return svgEl('svg', base, [
      svgEl('rect', { x: 2, y: 4, width: 20, height: 14, rx: 2 }),
      svgEl('path', { d: 'M8 20h8M12 16v4' })
    ]);
  }

  function init(container, opts) {
    const { value = 'system', titles = {}, onChange } = opts || {};

    container.classList.add('theme-pill');
    container.setAttribute('role', 'group');
    container.replaceChildren();

    const thumb = document.createElement('span');
    thumb.className = 'theme-pill-thumb';
    thumb.setAttribute('aria-hidden', 'true');
    container.appendChild(thumb);

    const buttons = MODES.map((mode) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'theme-pill-btn';
      btn.dataset.theme = mode;
      btn.title = titles[mode] || mode;
      btn.setAttribute('aria-label', titles[mode] || mode);
      btn.appendChild(icon(mode));
      container.appendChild(btn);
      return btn;
    });

    let committedIdx = Math.max(0, MODES.indexOf(value));
    let previewIdx = null;
    let suppressClick = false;
    const drag = { pointerId: null, startX: 0, hasMoved: false };

    const activeIdx = () => (previewIdx === null ? committedIdx : previewIdx);

    function moveThumb(idx, animate) {
      const btn = buttons[idx];
      if (!btn) return;
      const padLeft = parseFloat(getComputedStyle(container).paddingLeft) || 0;
      const x = btn.offsetLeft - padLeft;
      if (animate) {
        thumb.style.transform = `translateX(${x}px)`;
      } else {
        const prev = thumb.style.transition;
        thumb.style.transition = 'none';
        thumb.style.transform = `translateX(${x}px)`;
        void thumb.offsetHeight; // flush so the next change animates
        thumb.style.transition = prev || '';
      }
    }

    function render() {
      const idx = activeIdx();
      buttons.forEach((b, i) => b.classList.toggle('is-active', i === idx));
      moveThumb(idx, true);
    }

    function indexFromClientX(clientX) {
      const rect = container.getBoundingClientRect();
      const cs = getComputedStyle(container);
      const padLeft = parseFloat(cs.paddingLeft) || 0;
      const btnSize = parseFloat(cs.getPropertyValue('--pill-btn')) || 26;
      const gap = parseFloat(cs.getPropertyValue('--pill-gap')) || 3;
      const step = btnSize + gap;
      const offsetX = Math.max(
        0,
        Math.min(clientX - rect.left - padLeft, step * MODES.length)
      );
      const idx = Math.floor((offsetX + gap / 2) / step);
      return Math.max(0, Math.min(MODES.length - 1, idx));
    }

    function commit(idx) {
      committedIdx = idx;
      previewIdx = null;
      render();
      if (onChange) onChange(MODES[idx]);
    }

    container.addEventListener('pointerdown', (ev) => {
      if (ev.button !== 0) return;
      drag.pointerId = ev.pointerId;
      drag.startX = ev.clientX;
      drag.hasMoved = false;
      previewIdx = committedIdx;
    });

    container.addEventListener('pointermove', (ev) => {
      if (drag.pointerId !== ev.pointerId) return;
      if (Math.abs(ev.clientX - drag.startX) > 4) {
        if (!drag.hasMoved) {
          try {
            container.setPointerCapture(ev.pointerId);
          } catch {
            /* ignore */
          }
          container.classList.add('is-dragging');
        }
        drag.hasMoved = true;
      }
      if (!drag.hasMoved) return;
      const idx = indexFromClientX(ev.clientX);
      if (idx !== previewIdx) {
        previewIdx = idx;
        render();
      }
    });

    function end(ev) {
      if (drag.pointerId !== ev.pointerId) return;
      try {
        container.releasePointerCapture(ev.pointerId);
      } catch {
        /* ignore */
      }
      container.classList.remove('is-dragging');
      if (drag.hasMoved && previewIdx !== null) {
        suppressClick = true;
        commit(previewIdx);
        setTimeout(() => {
          suppressClick = false;
        }, 0);
      }
      drag.pointerId = null;
      drag.hasMoved = false;
      previewIdx = null;
      render();
    }

    container.addEventListener('pointerup', end);
    container.addEventListener('pointercancel', end);

    buttons.forEach((btn, i) =>
      btn.addEventListener('click', () => {
        if (!suppressClick) commit(i);
      })
    );

    requestAnimationFrame(() => moveThumb(committedIdx, false));
    render();

    return {
      set(next) {
        committedIdx = Math.max(0, MODES.indexOf(next));
        previewIdx = null;
        render();
      },
      // Re-measure positions — call after the pill becomes visible, since
      // offsetLeft is 0 while an ancestor is display:none.
      refresh() {
        buttons.forEach((b, i) =>
          b.classList.toggle('is-active', i === committedIdx)
        );
        moveThumb(committedIdx, false);
      },
      setTitles(map) {
        buttons.forEach((btn) => {
          const label = map[btn.dataset.theme];
          if (label) {
            btn.title = label;
            btn.setAttribute('aria-label', label);
          }
        });
      }
    };
  }

  const root = typeof self !== 'undefined' ? self : this;
  root.URLCopierThemePill = { init };
})();
