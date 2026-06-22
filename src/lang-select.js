// Custom language dropdown — a vanilla port of the template's LanguageSelector.
// A pill (flag + code + chevron) opens a panel listing every locale with its
// flag, native name and a check on the active one. A native <select> can't
// show images, hence this widget.
//
//   const sel = URLCopierLangSelect.init(el, { value, locales, onChange });
//   sel.set(code);
(function () {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  function svgEl(name, attrs, children) {
    const node = document.createElementNS(NS, name);
    Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
    (children || []).forEach((c) => node.appendChild(c));
    return node;
  }
  const chevron = () =>
    svgEl('svg', { class: 'lang-chevron', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
      svgEl('path', { d: 'M6 9l6 6 6-6' })
    ]);
  const check = () =>
    svgEl('svg', { class: 'lang-item-check', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
      svgEl('path', { d: 'M20 6L9 17l-5-5' })
    ]);

  function flag(code) {
    const span = document.createElement('span');
    span.className = 'lang-flag';
    span.appendChild(window.URLCopierFlags.create(code));
    return span;
  }

  function init(container, opts) {
    const { value = 'en', locales = [], onChange } = opts || {};
    let current = locales.some((l) => l.code === value) ? value : locales[0]?.code;
    let open = false;

    container.classList.add('lang-pill-wrap');
    container.replaceChildren();

    // Pill button
    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = 'lang-pill';
    pill.setAttribute('aria-haspopup', 'listbox');
    const pillFlag = flag(current);
    const pillCode = document.createElement('span');
    pillCode.className = 'lang-code';
    pillCode.textContent = current.toUpperCase();
    pill.append(pillFlag, pillCode, chevron());
    container.appendChild(pill);

    // Panel
    const panel = document.createElement('div');
    panel.className = 'lang-panel';
    panel.setAttribute('role', 'listbox');

    const items = locales.map((locale) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'lang-item';
      item.setAttribute('role', 'option');
      item.dataset.code = locale.code;

      const meta = document.createElement('div');
      meta.className = 'lang-item-meta';
      const name = document.createElement('div');
      name.className = 'lang-item-name';
      name.textContent = locale.label;
      const code = document.createElement('div');
      code.className = 'lang-item-code';
      code.textContent = locale.code.toUpperCase();
      meta.append(name, code);

      item.append(flag(locale.code), meta, check());
      item.addEventListener('click', () => select(locale.code));
      panel.appendChild(item);
      return item;
    });
    container.appendChild(panel);

    function renderActive() {
      items.forEach((it) =>
        it.classList.toggle('is-active', it.dataset.code === current)
      );
      pillFlag.replaceChildren(window.URLCopierFlags.create(current));
      pillCode.textContent = current.toUpperCase();
    }

    function setOpen(next) {
      open = next;
      container.classList.toggle('is-open', open);
      pill.setAttribute('aria-expanded', String(open));
    }

    function select(code) {
      current = code;
      renderActive();
      setOpen(false);
      if (onChange) onChange(code);
    }

    pill.addEventListener('click', (ev) => {
      ev.stopPropagation();
      setOpen(!open);
    });
    document.addEventListener('mousedown', (ev) => {
      if (open && !container.contains(ev.target)) setOpen(false);
    });
    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') setOpen(false);
    });

    renderActive();
    return {
      set(code) {
        current = code;
        renderActive();
      }
    };
  }

  const root = typeof self !== 'undefined' ? self : this;
  root.URLCopierLangSelect = { init };
})();
