// Shared URL formatting — used by the popup buttons and the content script's
// keyboard shortcut so every entry point produces identical output.
(function () {
  'use strict';

  // Query params dropped by the "No tracking" format.
  const TRACKING_PARAMS = [
    'fbclid', 'gclid', 'gbraid', 'wbraid', 'msclkid', 'yclid', 'igshid',
    'mc_eid', 'mc_cid', 'ref', 'ref_src', '_hsenc', '_hsmi', 'vero_id', 'oly_enc_id'
  ];

  function cleanUrl(raw) {
    try {
      const url = new URL(raw);
      [...url.searchParams.keys()].forEach((key) => {
        if (key.toLowerCase().startsWith('utm_') || TRACKING_PARAMS.includes(key)) {
          url.searchParams.delete(key);
        }
      });
      return url.toString();
    } catch {
      return raw;
    }
  }

  // format ∈ url | markdown | title-url | clean | domain
  function build(format, url, title) {
    const name = title || url;
    switch (format) {
      case 'markdown':
        return `[${name}](${url})`;
      case 'title-url':
        return `${name}\n${url}`;
      case 'clean':
        return cleanUrl(url);
      case 'domain':
        try {
          return new URL(url).hostname;
        } catch {
          return url;
        }
      default:
        return url;
    }
  }

  const root = typeof self !== 'undefined' ? self : this;
  root.URLCopierFormats = { build, cleanUrl };
})();
