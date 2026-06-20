// Content script — performs the clipboard write (it lives in the page, so the
// `clipboardWrite` permission lets it copy without a user gesture) and renders
// the in-page notification. It only ever reacts to extension runtime messages,
// never to page-originated window.postMessage — so a website can't spoof a
// "URL copied" toast.
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

let currentLanguage = 'en';
let showNotificationEnabled = true;
let theme = 'system'; // 'light' | 'dark' | 'system'

const t = (key) => self.urlCopierGetMessage(currentLanguage, key);

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------
async function loadSettings() {
  try {
    const data = await browserAPI.storage.sync.get([
      'language',
      'showNotification',
      'theme'
    ]);
    currentLanguage = data.language || 'en';
    showNotificationEnabled = data.showNotification !== false;
    theme = data.theme || 'system';
  } catch {
    currentLanguage = 'en';
    showNotificationEnabled = true;
    theme = 'system';
  }
}

browserAPI.storage.onChanged.addListener((changes, namespace) => {
  if (namespace !== 'sync') return;
  if (changes.language) currentLanguage = changes.language.newValue || 'en';
  if (changes.showNotification)
    showNotificationEnabled = changes.showNotification.newValue !== false;
  if (changes.theme) theme = changes.theme.newValue || 'system';
});

// ---------------------------------------------------------------------------
// Copy
// ---------------------------------------------------------------------------
function buildPayload(format) {
  const url = window.location.href;
  const title = document.title || url;
  switch (format) {
    case 'markdown':
      return `[${title}](${url})`;
    case 'title-url':
      return `${title}\n${url}`;
    default:
      return url;
  }
}

async function copy(format) {
  try {
    await navigator.clipboard.writeText(buildPayload(format));
    showNotification(t('copied'));
  } catch {
    // execCommand fallback for the rare page where the async API is blocked.
    try {
      const ta = document.createElement('textarea');
      ta.value = buildPayload(format);
      ta.style.cssText = 'position:fixed;top:-9999px;opacity:0;';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      showNotification(t('copied'));
    } catch {
      showNotification(t('copyError'), true);
    }
  }
}

browserAPI.runtime.onMessage.addListener((message) => {
  if (message && message.type === 'URL_COPIER_COPY') copy(message.format);
});

// ---------------------------------------------------------------------------
// Notification — glassy pill in the brand gradient palette, theme-aware.
// ---------------------------------------------------------------------------
const NOTIF_ID = 'url-copier-notif';
const STYLE_ID = 'url-copier-styles';

function prefersDark() {
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  return (
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
}

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes url-copier-in {
      from { opacity: 0; transform: translateY(12px) scale(0.96); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes url-copier-out {
      from { opacity: 1; transform: translateY(0) scale(1); }
      to   { opacity: 0; transform: translateY(12px) scale(0.96); }
    }
    #${NOTIF_ID} {
      position: fixed;
      bottom: 20px;
      right: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
      max-width: 320px;
      padding: 12px 16px 12px 14px;
      border-radius: 14px;
      font: 500 13.5px/1.4 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif;
      letter-spacing: 0.01em;
      z-index: 2147483647;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      animation: url-copier-in 0.24s cubic-bezier(0.16, 1, 0.3, 1);
      box-sizing: border-box;
    }
    #${NOTIF_ID} .url-copier-bar {
      width: 4px;
      align-self: stretch;
      border-radius: 9999px;
      background: linear-gradient(180deg, #b514fd, #5f75f5);
      flex: 0 0 auto;
    }
    #${NOTIF_ID}.is-error .url-copier-bar {
      background: linear-gradient(180deg, #ef4444, #b91c1c);
    }
  `;
  document.head.appendChild(style);
}

function showNotification(message, isError = false) {
  if (!showNotificationEnabled) return;

  injectStyles();

  const existing = document.getElementById(NOTIF_ID);
  if (existing) existing.remove();

  const dark = prefersDark();
  const notif = document.createElement('div');
  notif.id = NOTIF_ID;
  notif.classList.toggle('is-error', isError);
  Object.assign(notif.style, {
    background: dark ? 'rgba(31, 27, 56, 0.82)' : 'rgba(255, 255, 255, 0.86)',
    color: dark ? '#f6f6f6' : '#14172d',
    border: dark
      ? '1px solid rgba(255, 255, 255, 0.12)'
      : '1px solid rgba(181, 20, 253, 0.18)',
    boxShadow: dark
      ? '0 12px 28px -12px rgba(0, 0, 0, 0.6)'
      : '0 8px 24px -10px rgba(20, 23, 45, 0.25)'
  });

  const bar = document.createElement('span');
  bar.className = 'url-copier-bar';
  const text = document.createElement('span');
  text.textContent = message;
  notif.append(bar, text);
  document.body.appendChild(notif);

  setTimeout(() => {
    notif.style.animation = 'url-copier-out 0.22s ease forwards';
    setTimeout(() => notif.remove(), 220);
  }, 2000);
}

loadSettings();
