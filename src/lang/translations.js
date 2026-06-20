// Centralised i18n for URL Copier.
// One file, every locale. Exposes two globals that work in the background page,
// content scripts, the popup and the options page alike:
//   • URL_COPIER_LOCALES   – ordered metadata (code, label, flag)
//   • urlCopierGetMessage(lang, key) – safe lookup with English fallback
(function () {
  'use strict';

  const TRANSLATIONS = {
    en: {
      // Context menu
      contextMenuTitle: 'Copy URL',
      copyUrl: 'Copy URL',
      copyMarkdown: 'Copy as Markdown link',
      copyTitleUrl: 'Copy title + URL',
      // Notifications
      copied: '🔗 Copied to clipboard!',
      copyError: '❌ Copy failed',
      // Popup
      popupTitle: 'URL Copier',
      popupHint: 'Pick a format — it lands on your clipboard.',
      openSettings: 'Settings',
      // Options
      settingsTitle: 'URL Copier — Settings',
      generalSection: 'General',
      notifLabel: 'Show a notification when a URL is copied',
      langLabel: 'Language',
      themeLabel: 'Theme',
      themeLight: 'Light',
      themeDark: 'Dark',
      themeSystem: 'System',
      shortcutSection: 'Keyboard shortcut',
      shortcutHint: 'Copy the current URL with',
      saveButton: 'Save',
      savedMessage: 'Settings saved!'
    },
    fr: {
      contextMenuTitle: "Copier l'URL",
      copyUrl: "Copier l'URL",
      copyMarkdown: 'Copier en lien Markdown',
      copyTitleUrl: "Copier titre + URL",
      copied: '🔗 Copié dans le presse-papiers !',
      copyError: '❌ Échec de la copie',
      popupTitle: 'URL Copier',
      popupHint: 'Choisis un format — il atterrit dans ton presse-papiers.',
      openSettings: 'Paramètres',
      settingsTitle: 'URL Copier — Paramètres',
      generalSection: 'Général',
      notifLabel: "Afficher une notification quand une URL est copiée",
      langLabel: 'Langue',
      themeLabel: 'Thème',
      themeLight: 'Clair',
      themeDark: 'Sombre',
      themeSystem: 'Système',
      shortcutSection: 'Raccourci clavier',
      shortcutHint: "Copier l'URL courante avec",
      saveButton: 'Enregistrer',
      savedMessage: 'Paramètres enregistrés !'
    },
    es: {
      contextMenuTitle: 'Copiar URL',
      copyUrl: 'Copiar URL',
      copyMarkdown: 'Copiar como enlace Markdown',
      copyTitleUrl: 'Copiar título + URL',
      copied: '🔗 ¡Copiado al portapapeles!',
      copyError: '❌ Error al copiar',
      popupTitle: 'URL Copier',
      popupHint: 'Elige un formato — va directo al portapapeles.',
      openSettings: 'Ajustes',
      settingsTitle: 'URL Copier — Ajustes',
      generalSection: 'General',
      notifLabel: 'Mostrar una notificación al copiar una URL',
      langLabel: 'Idioma',
      themeLabel: 'Tema',
      themeLight: 'Claro',
      themeDark: 'Oscuro',
      themeSystem: 'Sistema',
      shortcutSection: 'Atajo de teclado',
      shortcutHint: 'Copiar la URL actual con',
      saveButton: 'Guardar',
      savedMessage: '¡Ajustes guardados!'
    },
    de: {
      contextMenuTitle: 'URL kopieren',
      copyUrl: 'URL kopieren',
      copyMarkdown: 'Als Markdown-Link kopieren',
      copyTitleUrl: 'Titel + URL kopieren',
      copied: '🔗 In die Zwischenablage kopiert!',
      copyError: '❌ Kopieren fehlgeschlagen',
      popupTitle: 'URL Copier',
      popupHint: 'Format wählen — landet in der Zwischenablage.',
      openSettings: 'Einstellungen',
      settingsTitle: 'URL Copier — Einstellungen',
      generalSection: 'Allgemein',
      notifLabel: 'Benachrichtigung anzeigen, wenn eine URL kopiert wird',
      langLabel: 'Sprache',
      themeLabel: 'Design',
      themeLight: 'Hell',
      themeDark: 'Dunkel',
      themeSystem: 'System',
      shortcutSection: 'Tastenkürzel',
      shortcutHint: 'Aktuelle URL kopieren mit',
      saveButton: 'Speichern',
      savedMessage: 'Einstellungen gespeichert!'
    },
    it: {
      contextMenuTitle: 'Copia URL',
      copyUrl: 'Copia URL',
      copyMarkdown: 'Copia come link Markdown',
      copyTitleUrl: 'Copia titolo + URL',
      copied: '🔗 Copiato negli appunti!',
      copyError: '❌ Copia non riuscita',
      popupTitle: 'URL Copier',
      popupHint: 'Scegli un formato — finisce negli appunti.',
      openSettings: 'Impostazioni',
      settingsTitle: 'URL Copier — Impostazioni',
      generalSection: 'Generale',
      notifLabel: 'Mostra una notifica quando una URL viene copiata',
      langLabel: 'Lingua',
      themeLabel: 'Tema',
      themeLight: 'Chiaro',
      themeDark: 'Scuro',
      themeSystem: 'Sistema',
      shortcutSection: 'Scorciatoia da tastiera',
      shortcutHint: "Copia l'URL corrente con",
      saveButton: 'Salva',
      savedMessage: 'Impostazioni salvate!'
    }
  };

  // Ordered for menus / selectors. Flags are plain emoji — no extra assets.
  const LOCALES = [
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'es', label: 'Español', flag: '🇪🇸' },
    { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
    { code: 'it', label: 'Italiano', flag: '🇮🇹' }
  ];

  function getMessage(lang, key) {
    const dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
    return dict[key] || TRANSLATIONS.en[key] || key;
  }

  // `self` resolves to the right global in every extension context
  // (background page window, content-script sandbox, popup/options window).
  const root = typeof self !== 'undefined' ? self : this;
  root.URL_COPIER_TRANSLATIONS = TRANSLATIONS;
  root.URL_COPIER_LOCALES = LOCALES;
  root.urlCopierGetMessage = getMessage;
})();
