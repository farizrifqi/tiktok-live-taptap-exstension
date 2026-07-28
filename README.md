# TikTok Live Clicker Extension

A lightweight browser extension that automatically clicks the heart (like) button on TikTok Live streams to boost engagement.

## Description

This extension adds a toolbar button that opens a popup with a simple toggle to start/stop auto‑liking on the current TikTok Live tab. When active, it injects a content script that repeatedly clicks the like button at a safe interval.

## Features

- Minimalist TikTok‑inspired UI (dark theme with red accents)
- One‑click toggle to start/stop auto‑liking
- Visual status indicator (online/idle/error)
- Progress counter showing likes sent vs. goal (default 5000)
- Works on any TikTok Live URL: `https://www.tiktok.com/@*/live*`

## Installation (Unpacked Extension)

### Google Chrome / Microsoft Edge

1. **Download or clone** this repository to your local machine.
2. Open the browser and navigate to:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
3. Enable **Developer mode** (toggle switch in the top‑right corner).
4. Click **Load unpacked**.
5. In the file picker, select the folder containing this `manifest.json` (i.e., the root of this extension).
6. The extension should appear in your toolbar with the TikTok logo.

### Mozilla Firefox (optional)

> This extension uses Manifest V3, which is supported in Firefox via the `webmanifest` key. If you encounter issues, you may need to adjust the manifest or use the WebExtension polyfill.

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on**…
3. Select the `manifest.json` file in this folder.
4. The extension will be loaded temporarily for this session.

## Usage

1. Navigate to any TikTok Live stream (e.g., `https://www.tiktok.com/@username/live`).
2. Click the extension icon in the toolbar to open the popup.
3. Press the large round button to **START** auto‑liking. The button will turn red and show a pulsing effect.
4. The popup displays a live count of likes sent and a progress bar toward the goal (default 5000).
5. To stop, press the button again (it will revert to grey and show **STOP**).

> **Note:** The extension only works on tabs that match the TikTok Live pattern. If you are not on a valid live page, a warning banner will appear in the popup.

## Configuration

The default like interval and goal are set in `content.js` and `popup.js`. To change them, edit the constants at the top of those files and reload the extension.

## Files

- `manifest.json` – Extension metadata and permissions.
- `popup.html` / `popup.js` – Popup UI and logic.
- `content.js` – Script injected into TikTok Live pages to perform clicks.
- `README.md` – This file.

## License

This project is provided for educational purposes only. Use responsibly and in accordance with TikTok's Terms of Service.

---

*Created with ❤️ using the Hermes Agent framework.*
