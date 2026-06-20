// Options page — language, theme and notification preferences. Everything is
// stored in `storage.sync`; the background page and content scripts react to
// the change events, so no manual message passing is required.
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

let currentLanguage = 'en';
let currentTheme = 'system';

const t = (key) => window.urlCopierGetMessage(currentLanguage, key);

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

  document.querySelectorAll('.seg-btn').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.theme === theme);
  });
}

function applyTranslations() {
  document.documentElement.lang = currentLanguage;
  document.title = t('settingsTitle');
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
}

function populateLanguages() {
  const select = document.getElementById('language');
  if (!select) return;
  select.innerHTML = '';
  (window.URL_COPIER_LOCALES || []).forEach(({ code, label, flag }) => {
    const opt = document.createElement('option');
    opt.value = code;
    opt.textContent = `${flag}  ${label}`;
    select.appendChild(opt);
  });
}

function showShortcut() {
  const el = document.getElementById('shortcutKeys');
  if (!el) return;
  const isMac = navigator.platform.toUpperCase().includes('MAC');
  el.textContent = isMac ? '⌘ + ⇧ + C' : 'Ctrl + Shift + C';
}

let statusTimer = null;
function flashSaved() {
  const status = document.getElementById('status');
  if (!status) return;
  status.textContent = `${t('savedMessage')} ✓`;
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => (status.textContent = ''), 1800);
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------
async function save(partial) {
  try {
    await browserAPI.storage.sync.set(partial);
  } catch {
    // Last-resort fallback so preferences still survive a reload.
    Object.entries(partial).forEach(([k, v]) =>
      localStorage.setItem(`url_copier_${k}`, String(v))
    );
  }
  flashSaved();
}

async function loadSettings() {
  let data = {};
  try {
    data = await browserAPI.storage.sync.get([
      'language',
      'showNotification',
      'theme'
    ]);
  } catch {
    data = {
      language: localStorage.getItem('url_copier_language') || 'en',
      showNotification:
        localStorage.getItem('url_copier_showNotification') !== 'false',
      theme: localStorage.getItem('url_copier_theme') || 'system'
    };
  }

  currentLanguage = data.language || 'en';
  const showNotif = data.showNotification !== false;
  const theme = data.theme || 'system';

  const select = document.getElementById('language');
  if (select) select.value = currentLanguage;
  const checkbox = document.getElementById('showNotification');
  if (checkbox) checkbox.checked = showNotif;

  applyTheme(theme);
  applyTranslations();
}

// ---------------------------------------------------------------------------
// Wiring
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  populateLanguages();
  showShortcut();
  await loadSettings();

  document.getElementById('language')?.addEventListener('change', (e) => {
    currentLanguage = e.target.value;
    applyTranslations();
    save({ language: currentLanguage });
  });

  document
    .getElementById('showNotification')
    ?.addEventListener('change', (e) =>
      save({ showNotification: e.target.checked })
    );

  document.querySelectorAll('.seg-btn').forEach((btn) =>
    btn.addEventListener('click', () => {
      applyTheme(btn.dataset.theme);
      save({ theme: btn.dataset.theme });
    })
  );

  // Follow the OS when in "system" mode.
  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', () => {
      if (currentTheme === 'system') applyTheme('system');
    });
});
