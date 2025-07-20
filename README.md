# URL Copier – Firefox Extension

<p align="center">
  <img src="src/icons/icon.png" alt="Extension Icon" width="128" height="128">
</p>

**A minimalist browser extension to copy the current tab’s URL with Cmd+Shift+C / Ctrl+Shift+C.**  
Stop triggering DevTools by accident. Lightweight, privacy-friendly, and blazing fast.

---

## 🔧 Features
- ⌨️ Copy current tab URL via `Cmd+Shift+C` / `Ctrl+Shift+C`
- 🛑 Prevents DevTools from opening with this shortcut
- 🔔 In-page visual feedback (non-intrusive)
- 🧠 No background scripts, no tracking, no data collection
- ✅ Works on all websites

---

## 🚀 Install

Coming soon on [Firefox Add-ons](https://addons.mozilla.org/).

Until then, you can install manually:
1. Clone or download this repo.
2. Go to `about:debugging` > This Firefox > Load Temporary Add-on.
3. Select the `dist/url-copier.xpi` file or `manifest.json` in `src/`.

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

Ensure `manifest.json` and `content.js` are inside the `src/` directory before building.

## 🧪 Use Case
Perfect for developers, researchers, and power users who frequently copy URLs and want a cleaner keyboard workflow.

## 📜 License
[MIT](LICENSE)