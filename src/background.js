// Background script - Enhanced error handling and storage fallbacks
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

let currentLanguage = 'en';

// Simplified translation function using global variables
function getMessage(key) {
  const translations = {
    en: window.translations_en || {},
    fr: window.translations_fr || {}
  };
  
  const messages = translations[currentLanguage] || translations.en || {};
  return messages[key] || key;
}

// Create context menu with current language
function createContextMenu() {
  console.log('Creating context menu with language:', currentLanguage);
  
  browserAPI.contextMenus.removeAll(() => {
    browserAPI.contextMenus.create({
      id: "copy-url",
      title: getMessage('contextMenuTitle'),
      contexts: ["page"]
    });
    console.log('Context menu created');
  });
}

// Load language from storage with fallbacks
async function loadLanguage() {
  try {
    if (browserAPI.storage && browserAPI.storage.sync) {
      const data = await browserAPI.storage.sync.get(['language']);
      currentLanguage = data.language || 'en';
      console.log('Language loaded:', currentLanguage);
    } else {
      currentLanguage = 'en';
    }
  } catch (error) {
    console.error('Error loading language:', error);
    currentLanguage = 'en';
  }
}

// Initialize extension
browserAPI.runtime.onInstalled.addListener(async () => {
  console.log('Extension installed/updated');
  await loadLanguage();
  createContextMenu();
});

browserAPI.runtime.onStartup.addListener(async () => {
  console.log('Browser started');
  await loadLanguage();
  createContextMenu();
});

// Gestion des clics sur le menu contextuel
browserAPI.contextMenus.onClicked.addListener((info, tab) => {
  console.log('Context menu clicked:', info.menuItemId);
  if (info.menuItemId === "copy-url" && tab && tab.url) {
    copyTabURL(tab.id);
  }
});

browserAPI.commands.onCommand.addListener((command) => {
  console.log('Command triggered:', command);
  if (command === "copy-url") {
    browserAPI.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      if (tabs[0]) {
        copyTabURL(tabs[0].id);
      }
    });
  }
});

// Copy URL function with enhanced error handling
function copyTabURL(tabId) {
  const successMessage = getMessage('urlCopied');
  const errorMessage = getMessage('copyError');
  
  console.log('Copying URL for tab:', tabId);
  
  browserAPI.tabs.executeScript(tabId, {
    code: `
      (function() {
        navigator.clipboard.writeText(window.location.href)
          .then(() => {
            console.log('URL copied successfully');
            window.postMessage({ 
              type: 'SHOW_NOTIFICATION', 
              message: "${successMessage}" 
            }, '*');
          })
          .catch((err) => {
            console.error("Failed to copy URL:", err);
            window.postMessage({ 
              type: 'SHOW_NOTIFICATION', 
              message: "${errorMessage}" 
            }, '*');
          });
      })();
    `
  });
}

// Listen for language changes
browserAPI.storage.onChanged.addListener((changes, namespace) => {
  console.log('Storage changed:', changes);
  if (namespace === 'sync' && changes.language) {
    currentLanguage = changes.language.newValue;
    console.log('Language changed to:', currentLanguage);
    createContextMenu();
  }
});

// Listen for messages with error handling
browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received:', message);
  if (message.type === 'LANGUAGE_CHANGED') {
    currentLanguage = message.language;
    console.log('Language updated via message:', currentLanguage);
    createContextMenu();
    sendResponse({ success: true });
  }
});

console.log('Background script loaded');