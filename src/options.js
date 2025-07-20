// Options script - Enhanced error handling and storage fallbacks
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

// Apply translations to the page
function applyTranslations(lang = 'en') {
  currentLanguage = lang;
  
  // Page title
  document.title = getMessage('settingsTitle');
  
  // Elements with data-i18n attribute
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = getMessage(key);
  });
  
  console.log('Translations applied for language:', lang);
}

// Load settings from storage with robust fallbacks
async function loadSettings() {
  try {
    let data = {};
    
    if (browserAPI.storage && browserAPI.storage.sync) {
      try {
        data = await browserAPI.storage.sync.get(['language', 'showNotification']);
        console.log('Settings loaded from storage:', data);
      } catch (error) {
        console.warn('Storage failed, using localStorage:', error);
        data = {
          language: localStorage.getItem('extension_language') || 'en',
          showNotification: localStorage.getItem('extension_showNotification') !== 'false'
        };
      }
    } else {
      data = {
        language: localStorage.getItem('extension_language') || 'en',
        showNotification: localStorage.getItem('extension_showNotification') !== 'false'
      };
    }
    
    const lang = data.language || 'en';
    const showNotif = data.showNotification !== false;
    
    // Apply values to form elements
    const select = document.getElementById('language');
    if (select) {
      select.value = lang;
    }
    
    const checkbox = document.getElementById('showNotification');
    if (checkbox) {
      checkbox.checked = showNotif;
    }
    
    // Apply translations
    applyTranslations(lang);
    
  } catch (error) {
    console.error('Error loading settings:', error);
    applyTranslations('en');
  }
}

// Save settings to storage
async function saveSettings() {
  const languageSelect = document.getElementById('language');
  const notificationCheckbox = document.getElementById('showNotification');
  const status = document.getElementById('status');
  
  if (!languageSelect || !notificationCheckbox) {
    console.error('Elements not found');
    return;
  }
  
  const language = languageSelect.value;
  const showNotification = notificationCheckbox.checked;
  
  console.log('Saving settings:', { language, showNotification });
  
  try {
    // Try Firefox storage first
    if (browserAPI.storage && browserAPI.storage.sync) {
      await browserAPI.storage.sync.set({
        language: language,
        showNotification: showNotification
      });
      console.log('Settings saved to Firefox storage');
    } else {
      throw new Error('Storage not available');
    }
    
    // Apply translations
    applyTranslations(language);
    
    // Visual feedback
    if (status) {
      status.textContent = getMessage('savedMessage') + ' ✓';
      status.style.color = 'green';
      setTimeout(() => {
        status.textContent = '';
      }, 2000);
    }
    
  } catch (error) {
    console.error('Error saving to storage:', error);
    
    // Fallback to localStorage
    try {
      localStorage.setItem('extension_language', language);
      localStorage.setItem('extension_showNotification', showNotification.toString());
      
      // Notify background script
      if (browserAPI.runtime && browserAPI.runtime.sendMessage) {
        browserAPI.runtime.sendMessage({
          type: 'LANGUAGE_CHANGED',
          language: language
        }).catch(err => console.log('Failed to notify background:', err));
      }
      
      applyTranslations(language);
      
      if (status) {
        status.textContent = getMessage('savedMessage') + ' ✓ (local)';
        status.style.color = 'orange';
        setTimeout(() => {
          status.textContent = '';
        }, 2000);
      }
      
    } catch (localError) {
      console.error('Complete save failure:', localError);
      if (status) {
        status.textContent = 'Erreur lors de la sauvegarde';
        status.style.color = 'red';
      }
    }
  }
}

// Initialize options page
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Options page loaded');
  
  // Load current settings
  await loadSettings();
  
  // Save button
  const saveBtn = document.getElementById('save');
  if (saveBtn) {
    saveBtn.addEventListener('click', (e) => {
      e.preventDefault();
      saveSettings();
    });
  }
  
  // Language change handler with immediate save
  const langSelect = document.getElementById('language');
  if (langSelect) {
    langSelect.addEventListener('change', (e) => {
      const newLang = e.target.value;
      console.log('Language changed to:', newLang);
      applyTranslations(newLang);
      saveSettings();
    });
  }
  
  // Debug button for testing
  const testBtn = document.getElementById('test');
  if (testBtn) {
    testBtn.addEventListener('click', () => {
      console.log('=== DEBUG INFO ===');
      console.log('Current language:', currentLanguage);
      console.log('window.translations_en:', window.translations_en);
      console.log('window.translations_fr:', window.translations_fr);
      console.log('Test getMessage urlCopied:', getMessage('urlCopied'));
      console.log('Test getMessage contextMenuTitle:', getMessage('contextMenuTitle'));
      console.log('=================');
    });
  }
});

console.log('Options script loaded');