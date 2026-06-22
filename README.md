# URL Copier – Firefox Extension

<p align="center">
    <img src="src/icons/icon.png" alt="Extension Icon" width="128" height="128">
</p>

**A minimalist browser extension to copy the current tab's URL with Cmd+Shift+C / Ctrl+Shift+C.**  
Stop triggering DevTools by accident. Lightweight, privacy-friendly, and blazing fast.

---

## 📸 Screenshots

<div align="center">
    <table>
        <tr>
            <td align="center">
                <img src="screenshots/popup.png" alt="Popup (light)" width="320">
                <br><em>Popup — light</em>
            </td>
            <td align="center">
                <img src="screenshots/popup-dark.png" alt="Popup (dark)" width="320">
                <br><em>Popup — dark</em>
            </td>
        </tr>
        <tr>
            <td align="center">
                <img src="screenshots/context-menu.png" alt="Right-click context menu" width="320">
                <br><em>Right-click menu</em>
            </td>
            <td align="center">
                <img src="screenshots/notification.png" alt="In-page copy confirmation" width="320">
                <br><em>In-page notification</em>
            </td>
        </tr>
    </table>
</div>

---

## 🔧 Features

- ⌨️ Copy the current tab URL via `Cmd+Shift+C` / `Ctrl+Shift+C`
- 🧩 **Five copy formats**: raw URL, Markdown link `[title](url)`, `title + URL`, tracking-free URL (strips `utm_*`, `fbclid`…), or domain only
- 🪟 **Combined popup** — copy buttons, a **QR code** of the page, copy **history** and all settings on one screen
- 🎯 **Configurable default format** for the keyboard shortcut
- 🎹 **Rebindable shortcut** — click it in the popup and press any combo
- 🖱️ Right-click context menu with a format sub-menu
- 🌍 **5 languages** (EN, FR, ES, DE, IT) with real-time switching and **SVG flags**
- 🎨 **Light / Dark / System theme** with a draggable pill, brand-styled glass UI
- 🛑 Prevents DevTools from opening with the shortcut (on regular web pages)
- 🔔 Non-intrusive, theme-aware in-page notification
- 🔒 Privacy-first: no tracking, **no data collection** (declared in the manifest); the QR code is generated locally
- ✅ Works on all websites

---

## 🚀 Install

**[Install from Firefox Add-ons](https://addons.mozilla.org/fr/firefox/addon/url-copier/)**

For development, you can install manually:
1. Clone or download this repo
2. Build the XPI: `make build`
3. Go to `about:debugging` > This Firefox > Load Temporary Add-on
4. Select the generated `.xpi` file from the `dist/` folder

Alternatively, for direct development:
- Go to `about:debugging` > This Firefox > Load Temporary Add-on
- Select `manifest.json` directly from the `src/` folder

---

## 🛠️ Build (.xpi)

To build the extension locally from source:

```bash
make build
```

This will create a `.xpi` archive in the `dist/` folder.

To clean the build:

```bash
make clean
```

Ensure `manifest.json` and all source files are inside the `src/` directory before building.

---

## ⚙️ Configuration

Access settings via the extension icon or `about:addons` > URL Copier > Preferences.

**Available options:**
- Toggle the notification shown when a URL is copied
- Choose the interface language (EN / FR / ES / DE / IT)
- Pick a theme (Light / Dark / System)
- Settings are saved instantly and synced across the browser

---

## 🧪 Use Case

Perfect for developers, researchers, and power users who frequently copy URLs and want a cleaner keyboard workflow. Ideal for:

- Quick URL sharing during development
- Research and reference collection
- Content creation workflows
- Anyone tired of accidentally opening DevTools

---

## 📜 License

[MIT](LICENSE)