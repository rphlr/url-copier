// Popup — single combined screen: copy actions, QR code, recent history and
// settings. Reads the active tab directly and copies from its own document,
// where the button click is a genuine user gesture.
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

let currentLanguage = 'en';
let currentTheme = 'system';
let activeTab = null;
let themePill = null;
let formatSelect = null;

const t = (key) => window.urlCopierGetMessage(currentLanguage, key);

const formatItems = () =>
  FORMAT_OPTIONS.map(({ value, key }) => ({ value, label: t(key) }));

const FORMAT_OPTIONS = [
  { value: 'url', key: 'formatUrl' },
  { value: 'markdown', key: 'formatMarkdown' },
  { value: 'title-url', key: 'formatTitleUrl' },
  { value: 'clean', key: 'cleanChip' },
  { value: 'domain', key: 'domainChip' }
];

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
function applyTheme(theme) {
  currentTheme = theme;
  const root = document.documentElement;
  const dark =
    theme === 'dark' ||
    (theme !== 'light' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
  root.classList.toggle('dark', dark);
  root.classList.toggle('light', !dark);
}

function themeTitles() {
  return {
    light: t('themeLight'),
    dark: t('themeDark'),
    system: t('themeSystem')
  };
}

function applyTranslations() {
  document.documentElement.lang = currentLanguage;
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  if (formatSelect) formatSelect.relabel(formatItems());
  if (themePill) themePill.setTitles(themeTitles());
}

function showShortcut() {
  const el = document.getElementById('shortcutKeys');
  if (!el) return;
  const isMac = navigator.platform.toUpperCase().includes('MAC');
  el.textContent = isMac ? '⌘ + ⇧ + C' : 'Ctrl + Shift + C';
}

// Resolve the tab to act on. In the toolbar popup this is the current tab; when
// the same page is opened as the options tab, that tab is an extension page, so
// fall back to the most recently used http(s) tab.
async function resolveActiveTab() {
  try {
    const [tab] = await browserAPI.tabs.query({ active: true, currentWindow: true });
    if (tab && /^https?:/.test(tab.url || '')) return tab;
    const all = await browserAPI.tabs.query({});
    const web = all
      .filter((t2) => /^https?:/.test(t2.url || ''))
      .sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0));
    return web[0] || tab || null;
  } catch {
    return null;
  }
}

const buildPayload = (format) =>
  window.URLCopierFormats.build(format, activeTab?.url || '', activeTab?.title);

// ---------------------------------------------------------------------------
// Copy
// ---------------------------------------------------------------------------
let statusTimer = null;
function flashStatus(message) {
  const status = document.getElementById('status');
  if (!status) return;
  status.textContent = message;
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => (status.textContent = ''), 1600);
}

async function copyText(text, button) {
  try {
    await navigator.clipboard.writeText(text);
    if (button) {
      button.classList.add('is-copied');
      setTimeout(() => button.classList.remove('is-copied'), 900);
    }
    flashStatus(t('copied'));
    if (activeTab?.url) {
      await window.URLCopierHistory.add(activeTab.url, activeTab.title);
      renderHistory();
    }
  } catch {
    flashStatus(t('copyError'));
  }
}

// ---------------------------------------------------------------------------
// QR code
// ---------------------------------------------------------------------------
function renderQR(url) {
  const host = document.getElementById('qr');
  const card = document.querySelector('.qr-card');
  if (!host) return;
  const qr = url && window.URLCopierQR ? window.URLCopierQR.generate(url) : null;
  if (!qr) {
    if (card) card.style.display = 'none';
    return;
  }
  if (card) card.style.display = '';

  const { size, modules } = qr;
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.setAttribute('shape-rendering', 'crispEdges');

  let d = '';
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (modules[r][c]) d += `M${c} ${r}h1v1h-1z`;
    }
  }
  const path = document.createElementNS(svgNS, 'path');
  path.setAttribute('d', d);
  path.setAttribute('fill', '#14172d');
  svg.appendChild(path);

  host.replaceChildren(svg);
}

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------
async function renderHistory() {
  const host = document.getElementById('history');
  if (!host) return;
  const items = await window.URLCopierHistory.get();
  host.replaceChildren();

  if (!items.length) {
    const empty = document.createElement('p');
    empty.className = 'history-empty';
    empty.textContent = t('historyEmpty');
    host.appendChild(empty);
    return;
  }

  items.forEach((item) => {
    const btn = document.createElement('button');
    btn.className = 'history-item';
    btn.title = item.url;
    const label = document.createElement('span');
    label.className = 'h-title';
    label.textContent = item.url;
    const ico = document.createElement('span');
    ico.className = 'h-ico';
    ico.textContent = '⧉';
    btn.append(label, ico);
    btn.addEventListener('click', () => copyText(item.url));
    host.appendChild(btn);
  });
}

// ---------------------------------------------------------------------------
// Settings persistence (shared with the options page via storage.local)
// ---------------------------------------------------------------------------
async function save(partial) {
  try {
    await browserAPI.storage.local.set(partial);
  } catch {
    Object.entries(partial).forEach(([k, v]) =>
      localStorage.setItem(`url_copier_${k}`, String(v))
    );
  }
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
async function init() {
  let theme = 'system';
  let showNotif = true;
  let defaultFormat = 'url';
  try {
    const data = await browserAPI.storage.local.get([
      'language',
      'theme',
      'showNotification',
      'defaultFormat'
    ]);
    currentLanguage = data.language || 'en';
    theme = data.theme || 'system';
    showNotif = data.showNotification !== false;
    defaultFormat = data.defaultFormat || 'url';
  } catch {
    /* defaults */
  }

  document.getElementById('setNotif').checked = showNotif;
  applyTheme(theme);

  window.URLCopierLangSelect.init(document.getElementById('setLang'), {
    value: currentLanguage,
    locales: window.URL_COPIER_LOCALES,
    onChange: (code) => {
      currentLanguage = code;
      applyTranslations();
      renderHistory();
      save({ language: code });
    }
  });

  themePill = window.URLCopierThemePill.init(document.getElementById('setTheme'), {
    value: theme,
    titles: themeTitles(),
    onChange: (val) => {
      applyTheme(val);
      save({ theme: val });
    }
  });

  formatSelect = window.URLCopierFormatSelect.init(
    document.getElementById('setDefaultFormat'),
    {
      value: defaultFormat,
      items: formatItems(),
      onChange: (val) => save({ defaultFormat: val })
    }
  );

  showShortcut();
  applyTranslations();
  document.getElementById('copyright').textContent =
    `© ${new Date().getFullYear()} · URL Copier`;

  activeTab = await resolveActiveTab();

  const preview = document.getElementById('urlPreview');
  if (preview) {
    preview.textContent = activeTab?.url || '—';
    preview.title = activeTab?.url || '';
  }

  renderQR(activeTab?.url || '');
  renderHistory();

  document.querySelectorAll('.action, .chip').forEach((btn) =>
    btn.addEventListener('click', () =>
      copyText(buildPayload(btn.dataset.format), btn)
    )
  );

  document.getElementById('clearHistory').addEventListener('click', async () => {
    await window.URLCopierHistory.clear();
    renderHistory();
  });

  document
    .getElementById('setNotif')
    .addEventListener('change', (e) => save({ showNotification: e.target.checked }));
}

document.addEventListener('DOMContentLoaded', init);
