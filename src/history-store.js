// Tiny shared copy-history store backed by storage.local. Used by both the
// popup and the content script so every copy (button, shortcut or context
// menu) lands in the same list. Newest first, deduped by URL, capped.
(function () {
  'use strict';

  const api = typeof browser !== 'undefined' ? browser : chrome;
  const KEY = 'history';
  const MAX = 12;

  async function add(url, title) {
    if (!url) return;
    try {
      const { history = [] } = await api.storage.local.get([KEY]);
      const next = history.filter((item) => item.url !== url);
      next.unshift({ url, title: title || url });
      await api.storage.local.set({ [KEY]: next.slice(0, MAX) });
    } catch {
      /* storage unavailable — history is best-effort */
    }
  }

  async function get() {
    try {
      const { history = [] } = await api.storage.local.get([KEY]);
      return history;
    } catch {
      return [];
    }
  }

  async function clear() {
    try {
      await api.storage.local.set({ [KEY]: [] });
    } catch {
      /* ignore */
    }
  }

  const root = typeof self !== 'undefined' ? self : this;
  root.URLCopierHistory = { add, get, clear };
})();
