// Shared keyboard-shortcut helpers. The shortcut is stored in storage.local as
// { ctrl, meta, shift, alt, code } and matched in-page by the content script,
// so any combo can be captured and its default browser action suppressed
// (that's how Cmd/Ctrl+Shift+C stops the Inspector from opening).
(function () {
  'use strict';

  const isMac =
    typeof navigator !== 'undefined' &&
    navigator.platform.toUpperCase().includes('MAC');

  function defaultShortcut() {
    return { ctrl: !isMac, meta: isMac, shift: true, alt: false, code: 'KeyC' };
  }

  const isModifierCode = (code) => /^(Control|Shift|Alt|Meta|OS)/.test(code);

  // Build a shortcut from a keydown event, or null if it isn't a valid combo
  // (requires Ctrl or Cmd plus a non-modifier key).
  function fromEvent(e) {
    if (isModifierCode(e.code) || !e.code) return null;
    if (!e.ctrlKey && !e.metaKey) return null;
    return {
      ctrl: e.ctrlKey,
      meta: e.metaKey,
      shift: e.shiftKey,
      alt: e.altKey,
      code: e.code
    };
  }

  function matches(e, s) {
    return (
      !!s &&
      e.ctrlKey === !!s.ctrl &&
      e.metaKey === !!s.meta &&
      e.shiftKey === !!s.shift &&
      e.altKey === !!s.alt &&
      e.code === s.code
    );
  }

  function codeLabel(code) {
    if (code.startsWith('Key')) return code.slice(3);
    if (code.startsWith('Digit')) return code.slice(5);
    const map = {
      Space: '␣', Comma: ',', Period: '.', Slash: '/', Semicolon: ';',
      Quote: "'", BracketLeft: '[', BracketRight: ']', Backslash: '\\',
      Minus: '-', Equal: '=', Enter: '⏎', Tab: '⇥'
    };
    return map[code] || code;
  }

  // Ordered tokens for display, e.g. ['⌘','⇧','C'] or ['Ctrl','Shift','C'].
  function format(s) {
    if (!s) return [];
    const tokens = [];
    if (s.ctrl) tokens.push(isMac ? '⌃' : 'Ctrl');
    if (s.alt) tokens.push(isMac ? '⌥' : 'Alt');
    if (s.shift) tokens.push(isMac ? '⇧' : 'Shift');
    if (s.meta) tokens.push(isMac ? '⌘' : 'Meta');
    tokens.push(codeLabel(s.code));
    return tokens;
  }

  const root = typeof self !== 'undefined' ? self : this;
  root.URLCopierShortcut = { defaultShortcut, fromEvent, matches, format, isMac };
})();
