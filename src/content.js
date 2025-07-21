// Content script - Enhanced error handling and storage fallbacks
const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

let currentLanguage = 'en';
let showNotificationEnabled = true; // Nouvelle variable pour gérer les notifications

// Simplified translation function using global variables
function getMessage(key) {
  const translations = {
    en: window.translations_en || {},
    fr: window.translations_fr || {}
  };
  
  const messages = translations[currentLanguage] || translations.en || {};
  return messages[key] || key;
}

// Load settings from storage with fallbacks
async function loadSettings() {
  try {
    if (browserAPI.storage && browserAPI.storage.sync) {
      const data = await browserAPI.storage.sync.get(['language', 'showNotification']);
      currentLanguage = data.language || 'en';
      showNotificationEnabled = data.showNotification !== false; // Par défaut true
      console.log('Settings loaded in content script:', { currentLanguage, showNotificationEnabled });
    } else {
      currentLanguage = localStorage.getItem('extension_language') || 'en';
      showNotificationEnabled = localStorage.getItem('extension_showNotification') !== 'false';
    }
  } catch (error) {
    console.error('Error loading settings in content script:', error);
    currentLanguage = 'en';
    showNotificationEnabled = true;
  }
}

// Show notification to user with enhanced styling - ONLY if enabled
function showNotification(message) {
    // Vérifier si les notifications sont activées
    if (!showNotificationEnabled) {
        console.log('Notifications disabled, not showing:', message);
        return;
    }

    let existing = document.getElementById('url-copy-notif');
    if (existing) {
        existing.style.animation = 'blink 0.3s';
        setTimeout(() => existing.style.animation = '', 300);
        return;
    }

    const notif = document.createElement('div');
    notif.id = 'url-copy-notif';
    notif.textContent = message;
    Object.assign(notif.style, {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        backgroundColor: 'rgba(51, 51, 51, 0.9)',
        color: '#fff',
        padding: '12px 16px',
        borderRadius: '8px',
        fontSize: '14px',
        fontFamily: 'system-ui, sans-serif',
        zIndex: '999999',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        opacity: '0',
        transition: 'opacity 0.3s ease',
        maxWidth: '300px',
        wordWrap: 'break-word'
    });

    // Add animation CSS if not already present
    if (!document.getElementById('url-copy-styles')) {
        const style = document.createElement('style');
        style.id = 'url-copy-styles';
        style.textContent = `
            @keyframes blink {
                0% { opacity: 1; }
                50% { opacity: 0.5; }
                100% { opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(notif);
    
    // Fade in animation
    setTimeout(() => {
        notif.style.opacity = '1';
    }, 10);

    // Auto-hide after 2 seconds with fade out
    setTimeout(() => {
        notif.style.opacity = '0';
        setTimeout(() => {
            if (notif.parentNode) {
                notif.remove();
            }
        }, 300);
    }, 2000);
}

// Listen for messages from background script
window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data) return;
    
    if (event.data.type === 'SHOW_NOTIFICATION') {
        showNotification(event.data.message);
    }
});

// Handle keyboard shortcut directly with enhanced error handling
document.addEventListener('keydown', async function(event) {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modKey = isMac ? event.metaKey : event.ctrlKey;

    if (modKey && event.shiftKey && event.code === 'KeyC') {
        event.preventDefault();
        event.stopImmediatePropagation();

        // Reload settings to ensure current preferences
        await loadSettings();

        try {
            await navigator.clipboard.writeText(window.location.href);
            // Seulement afficher la notification si elle est activée
            if (showNotificationEnabled) {
                showNotification(getMessage('urlCopied'));
            }
            console.log('URL copied via keyboard shortcut');
        } catch (err) {
            console.error("Copy failed:", err);
            // Seulement afficher la notification d'erreur si elle est activée
            if (showNotificationEnabled) {
                showNotification(getMessage('copyError'));
            }
        }
    }
}, true);

// Listen for storage changes with error handling
browserAPI.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync') {
        if (changes.language) {
            currentLanguage = changes.language.newValue;
            console.log('Language changed in content script:', currentLanguage);
        }
        if (changes.showNotification) {
            showNotificationEnabled = changes.showNotification.newValue;
            console.log('Notification setting changed in content script:', showNotificationEnabled);
        }
    }
});

// Initialize with error handling
loadSettings();

console.log('Content script loaded');