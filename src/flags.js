// Inline SVG flags for the language selector. SVG (not emoji) so they render
// identically on every OS, including Windows. Built with createElementNS so
// Firefox lays them out reliably. viewBox 60×40 (3:2), clipped to a rounded
// box by the .lang-flag wrapper.
(function () {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';

  function el(name, attrs, children) {
    const node = document.createElementNS(NS, name);
    Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
    (children || []).forEach((c) => node.appendChild(c));
    return node;
  }

  const rect = (x, y, w, h, fill) =>
    el('rect', { x, y, width: w, height: h, fill });

  const svg = (children) =>
    el('svg', { viewBox: '0 0 60 40', preserveAspectRatio: 'xMidYMid slice' }, children);

  const BUILDERS = {
    fr: () =>
      svg([rect(0, 0, 20, 40, '#0055A4'), rect(20, 0, 20, 40, '#ffffff'), rect(40, 0, 20, 40, '#EF4135')]),
    it: () =>
      svg([rect(0, 0, 20, 40, '#009246'), rect(20, 0, 20, 40, '#ffffff'), rect(40, 0, 20, 40, '#CE2B37')]),
    de: () =>
      svg([rect(0, 0, 60, 13.34, '#000000'), rect(0, 13.34, 60, 13.33, '#DD0000'), rect(0, 26.67, 60, 13.33, '#FFCE00')]),
    es: () =>
      svg([rect(0, 0, 60, 40, '#AA151B'), rect(0, 10, 60, 20, '#F1BF00')]),
    en: () =>
      svg([
        rect(0, 0, 60, 40, '#012169'),
        el('path', { d: 'M0,0 L60,40 M60,0 L0,40', stroke: '#ffffff', 'stroke-width': 12 }),
        el('path', { d: 'M0,0 L60,40 M60,0 L0,40', stroke: '#C8102E', 'stroke-width': 6 }),
        el('path', { d: 'M30,0 V40 M0,20 H60', stroke: '#ffffff', 'stroke-width': 16 }),
        el('path', { d: 'M30,0 V40 M0,20 H60', stroke: '#C8102E', 'stroke-width': 8 })
      ])
  };

  function create(code) {
    return (BUILDERS[code] || BUILDERS.en)();
  }

  const root = typeof self !== 'undefined' ? self : this;
  root.URLCopierFlags = { create };
})();
