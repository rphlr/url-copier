// Custom dropdown for the default copy format, with an inline SVG icon per
// option. Mirrors the language dropdown's pill/panel structure and reuses its
// `.lang-*` classes plus the `.opt-icon` styling.
//
//   const sel = URLCopierFormatSelect.init(el, { value, items, onChange });
//   sel.set(value);
(function () {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  function s(name, attrs, children) {
    const node = document.createElementNS(NS, name);
    Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
    (children || []).forEach((c) => node.appendChild(c));
    return node;
  }
  const stroked = (children) =>
    s('svg', { class: 'opt-icon', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, children);
  const p = (d) => s('path', { d });

  const ICONS = {
    url: () => stroked([
      p('M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.71 1.71'),
      p('M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71')
    ]),
    markdown: () => stroked([
      p('M8 4H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h2'),
      p('M16 4h2a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-2')
    ]),
    'title-url': () => stroked([
      p('M7 3h7l4 4v14H7z'),
      p('M14 3v4h4'),
      p('M9.5 12h5'),
      p('M9.5 16h5')
    ]),
    clean: () => stroked([p('M12 3l7 3v5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6z')]),
    domain: () => stroked([
      s('circle', { cx: 12, cy: 12, r: 9 }),
      p('M3 12h18'),
      p('M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18')
    ])
  };

  const chevron = () =>
    s('svg', { class: 'lang-chevron', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [p('M6 9l6 6 6-6')]);
  const check = () =>
    s('svg', { class: 'lang-item-check', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [p('M20 6L9 17l-5-5')]);

  function icon(value) {
    return (ICONS[value] || ICONS.url)();
  }

  function init(container, opts) {
    const { value, items = [], onChange } = opts || {};
    let list = items;
    let current = list.some((i) => i.value === value) ? value : list[0]?.value;
    let open = false;

    container.classList.add('lang-pill-wrap', 'opt-wrap');
    container.replaceChildren();

    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = 'lang-pill';
    pill.setAttribute('aria-haspopup', 'listbox');
    const pillIcon = document.createElement('span');
    pillIcon.className = 'opt-icon-wrap';
    const pillLabel = document.createElement('span');
    pillLabel.className = 'opt-label';
    pill.append(pillIcon, pillLabel, chevron());
    container.appendChild(pill);

    const panel = document.createElement('div');
    panel.className = 'lang-panel';
    panel.setAttribute('role', 'listbox');

    const rows = items.map((it) => {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'lang-item';
      row.setAttribute('role', 'option');
      row.dataset.value = it.value;
      const ic = document.createElement('span');
      ic.className = 'opt-icon-wrap';
      ic.appendChild(icon(it.value));
      const name = document.createElement('span');
      name.className = 'lang-item-name';
      name.textContent = it.label;
      row.append(ic, name, check());
      row.addEventListener('click', () => select(it.value));
      panel.appendChild(row);
      return row;
    });
    container.appendChild(panel);

    const labelFor = (val) => (list.find((i) => i.value === val) || {}).label || '';

    function render() {
      pillIcon.replaceChildren(icon(current));
      pillLabel.textContent = labelFor(current);
      rows.forEach((r) => r.classList.toggle('is-active', r.dataset.value === current));
    }
    function setOpen(next) {
      open = next;
      container.classList.toggle('is-open', open);
      pill.setAttribute('aria-expanded', String(open));
    }
    function select(val) {
      current = val;
      render();
      setOpen(false);
      if (onChange) onChange(val);
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

    render();
    return {
      set(val) {
        current = val;
        render();
      },
      relabel(newItems) {
        list = newItems;
        rows.forEach((r) => {
          const it = list.find((i) => i.value === r.dataset.value);
          if (it) r.querySelector('.lang-item-name').textContent = it.label;
        });
        render();
      }
    };
  }

  const root = typeof self !== 'undefined' ? self : this;
  root.URLCopierFormatSelect = { init };
})();
