// Popup — the toolbar button's UI. It reads the active tab directly (it has the
// `tabs` permission) and copies from its own document, where the button click
// is a genuine user gesture. No content script round-trip needed, so it works
// even on pages where content scripts can't run.
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

let currentLanguage = 'en';
let activeTab = null;
const t = (key) => window.urlCopierGetMessage(currentLanguage, key);

function applyTheme(theme) {
  const root = document.documentElement;
  const dark =
    theme === 'dark' ||
    (theme !== 'light' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
  root.classList.toggle('dark', dark);
  root.classList.toggle('light', !dark);
}

function applyTranslations() {
  document.documentElement.lang = currentLanguage;
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
}

function buildPayload(format) {
  const url = activeTab?.url || '';
  const title = activeTab?.title || url;
  switch (format) {
    case 'markdown':
      return `[${title}](${url})`;
    case 'title-url':
      return `${title}\n${url}`;
    default:
      return url;
  }
}

let statusTimer = null;
function flashStatus(message) {
  const status = document.getElementById('status');
  if (!status) return;
  status.textContent = message;
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => (status.textContent = ''), 1600);
}

async function handleCopy(button) {
  const format = button.dataset.format;
  try {
    await navigator.clipboard.writeText(buildPayload(format));
    button.classList.add('is-copied');
    flashStatus(t('copied'));
    setTimeout(() => button.classList.remove('is-copied'), 900);
  } catch {
    flashStatus(t('copyError'));
  }
}

async function init() {
  let theme = 'system';
  try {
    const data = await browserAPI.storage.sync.get(['language', 'theme']);
    currentLanguage = data.language || 'en';
    theme = data.theme || 'system';
  } catch {
    /* defaults */
  }

  applyTheme(theme);
  applyTranslations();

  try {
    const tabs = await browserAPI.tabs.query({
      active: true,
      currentWindow: true
    });
    activeTab = tabs[0] || null;
  } catch {
    /* no tab access */
  }

  const preview = document.getElementById('urlPreview');
  if (preview) {
    preview.textContent = activeTab?.url || '—';
    preview.title = activeTab?.url || '';
  }

  document.querySelectorAll('.action').forEach((btn) =>
    btn.addEventListener('click', () => handleCopy(btn))
  );

  const settings = document.getElementById('openSettings');
  if (settings) {
    settings.addEventListener('click', () => {
      if (browserAPI.runtime.openOptionsPage) {
        browserAPI.runtime.openOptionsPage();
      } else {
        browserAPI.tabs.create({ url: browserAPI.runtime.getURL('options.html') });
      }
      window.close();
    });
  }
}

document.addEventListener('DOMContentLoaded', init);
