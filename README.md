# Interpark Ticket Queue Monitor

[中文文档](README.zh-CN.md)

A Chrome extension that monitors the Interpark ticket waiting queue and sends desktop notifications when your queue position drops below preset thresholds.

## Features

| Feature | Detail |
|---------|--------|
| Target | "My waiting order" queue number |
| Thresholds | ≤ 1000, ≤ 500, ≤ 100 |
| Notifications | Once per threshold (resettable) |
| Keep-alive | Prevents tab from being suspended by Chrome |

## Installation

1. Open Chrome and go to `chrome://extensions`
2. Enable **"Developer mode"** (toggle in the top-right corner)
3. Click **"Load unpacked"** (top-left)
4. Select the `ticket-monitor` folder
5. The extension icon will appear in your toolbar

> **Note**: After installing or updating the extension, you must **close and reopen** the queue page for changes to take effect.

## Usage

### Start Monitoring

1. Navigate to the Interpark queue page (URL pattern: `https://tickets.interpark.com/waiting?key=...`)
2. The extension starts monitoring automatically — no action needed
3. When your queue number crosses a threshold, a desktop notification will pop up

### Check Status

Click the extension icon in the toolbar to open the popup:

- **Current queue number** — large real-time display
- **Threshold status** — each threshold shows "Waiting" or "Notified ✓"
- **Reset button** — resets all thresholds back to "Waiting" for a new queue session

### Notifications

When your queue number drops below a threshold, a system notification appears:

> **Queue Progress Alert**
> Your queue number has dropped to 987 (threshold: 1000). You're getting closer!

## Architecture

```
Queue page (content.js)
  ├── MutationObserver → real-time DOM change detection
  ├── 20s polling → fallback
  └── Silent audio → prevents tab suspension
        │
        ▼  chrome.runtime.sendMessage
        │
Service Worker (background.js)
  ├── Receives queue number updates
  ├── Checks threshold conditions
  ├── Fires desktop notifications
  └── chrome.alarms every 20s → bidirectional keep-alive
```

## Testing

Open DevTools Console (F12) on the queue page and run:

```js
// Simulate queue number dropping to 999 (triggers ≤1000 notification)
document.querySelector('[class*="StatusBox_mainText"] strong').textContent = '999';

// Simulate queue number dropping to 499 (triggers ≤500 notification)
document.querySelector('[class*="StatusBox_mainText"] strong').textContent = '499';

// Simulate queue number dropping to 99 (triggers ≤100 notification)
document.querySelector('[class*="StatusBox_mainText"] strong').textContent = '99';
```

Click "Reset" in the extension popup to clear triggered thresholds after testing.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Extension not working, no console logs | Reload the extension ⟳, then **close and reopen** the queue page |
| Notifications not appearing | Check system notification settings — ensure Chrome notifications are allowed |
| Tab still gets suspended | Make sure you've clicked or pressed a key once on the queue page (activates audio keep-alive) |
| Popup shows "--" | The queue page may not be open, or the tab is not in focus |

### Viewing Logs

1. **Page logs**: Queue page → F12 → Console → filter `[TicketMonitor]`
2. **Background logs**: `chrome://extensions` → click "Service Worker" link on the extension card

## File Structure

```
ticket-monitor/
├── manifest.json      # Chrome extension config (Manifest V3)
├── content.js         # Injected into queue page: DOM watcher + data extraction
├── background.js      # Service worker: notification logic + state management
├── popup.html         # Popup UI
├── popup.js           # Popup logic
├── icon16.png         # Extension icon 16x16
├── icon48.png         # Extension icon 48x48
└── icon128.png        # Extension icon 128x128
```

## License

MIT
