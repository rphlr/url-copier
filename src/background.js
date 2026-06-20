// Background script — orchestrates the context menu, the keyboard command and
// the toolbar, then hands the actual copy off to the content script via a
// runtime message. No string injection, no spoofable window.postMessage.
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

let currentLanguage = 'en';

const t = (key) => self.urlCopierGetMessage(currentLanguage, key);

// The three copy formats, mirrored in the popup and the content script.
const FORMATS = ['url', 'markdown', 'title-url'];

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------
async function loadLanguage() {
  try {
    const { language } = await browserAPI.storage.sync.get(['language']);
    currentLanguage = language || 'en';
  } catch {
    currentLanguage = 'en';
  }
}

// ---------------------------------------------------------------------------
// Context menu — a parent entry with one child per format.
// ---------------------------------------------------------------------------
function buildContextMenu() {
  browserAPI.contextMenus.removeAll(() => {
    browserAPI.contextMenus.create({
      id: 'copy-url-parent',
      title: t('contextMenuTitle'),
      contexts: ['page', 'frame', 'link', 'selection']
    });
    browserAPI.contextMenus.create({
      id: 'copy-url',
      parentId: 'copy-url-parent',
      title: t('copyUrl'),
      contexts: ['page', 'frame', 'link', 'selection']
    });
    browserAPI.contextMenus.create({
      id: 'copy-markdown',
      parentId: 'copy-url-parent',
      title: t('copyMarkdown'),
      contexts: ['page', 'frame', 'link', 'selection']
    });
    browserAPI.contextMenus.create({
      id: 'copy-title-url',
      parentId: 'copy-url-parent',
      title: t('copyTitleUrl'),
      contexts: ['page', 'frame', 'link', 'selection']
    });
  });
}

const MENU_TO_FORMAT = {
  'copy-url': 'url',
  'copy-markdown': 'markdown',
  'copy-title-url': 'title-url'
};

// ---------------------------------------------------------------------------
// Copy: ask the active tab's content script to do the clipboard write so the
// notification can render in-page. Falls back gracefully if no content script
// is reachable (e.g. about: pages).
// ---------------------------------------------------------------------------
function requestCopy(tabId, format) {
  if (typeof tabId !== 'number') return;
  browserAPI.tabs
    .sendMessage(tabId, { type: 'URL_COPIER_COPY', format })
    .catch(() => {
      /* No content script on this page — nothing we can do from MV2 here. */
    });
}

function copyActiveTab(format) {
  browserAPI.tabs
    .query({ active: true, currentWindow: true })
    .then((tabs) => tabs[0] && requestCopy(tabs[0].id, format));
}

// ---------------------------------------------------------------------------
// Wiring
// ---------------------------------------------------------------------------
browserAPI.runtime.onInstalled.addListener(async () => {
  await loadLanguage();
  buildContextMenu();
});

browserAPI.runtime.onStartup.addListener(async () => {
  await loadLanguage();
  buildContextMenu();
});

browserAPI.contextMenus.onClicked.addListener((info, tab) => {
  const format = MENU_TO_FORMAT[info.menuItemId];
  if (format && tab) requestCopy(tab.id, format);
});

browserAPI.commands.onCommand.addListener((command) => {
  if (command === 'copy-url') copyActiveTab('url');
});

// Rebuild the menu (re-translated) whenever the language changes.
browserAPI.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes.language) {
    currentLanguage = changes.language.newValue || 'en';
    buildContextMenu();
  }
});

// The popup copies on its own (it has the tab data + a user gesture), but it
// pings us so the menu language stays in sync if it was just changed.
browserAPI.runtime.onMessage.addListener((message) => {
  if (message && message.type === 'URL_COPIER_LANGUAGE') {
    currentLanguage = message.language || 'en';
    buildContextMenu();
  }
});

// Make sure the menu exists even on a plain background wake-up.
loadLanguage().then(buildContextMenu);
