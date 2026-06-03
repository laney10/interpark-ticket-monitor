const THRESHOLDS = [1000, 500, 100];
const STORAGE_KEY = 'ticketMonitor';
const POLL_INTERVAL_MINUTES = 20 / 60; // 20 seconds

console.log('[TicketMonitor BG] Service worker started');

// --- Alarm: periodic wake-up to poll the tab ---
// This keeps monitoring alive even when the tab is backgrounded.
// chrome.alarms fires reliably regardless of tab state.

chrome.alarms.create('poll', { periodInMinutes: POLL_INTERVAL_MINUTES });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== 'poll') return;

  try {
    const tabs = await chrome.tabs.query({ url: 'https://tickets.interpark.com/*' });
    if (tabs.length === 0) return;

    for (const tab of tabs) {
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_CURRENT_NUMBER' });
        if (response && response.number !== null && response.number !== undefined) {
          console.log('[TicketMonitor BG] Alarm poll got:', response.number);
          await handleQueueUpdate(response.number);
          break; // Only need one tab's data
        }
      } catch (_e) {
        // Tab might not have content script loaded (e.g. not the waiting page)
      }
    }
  } catch (e) {
    console.error('[TicketMonitor BG] Alarm poll error:', e);
  }
});

// --- State management ---

async function getState() {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return result[STORAGE_KEY] || {
    currentNumber: null,
    notifiedThresholds: [],
    lastUpdate: null
  };
}

async function saveState(state) {
  await chrome.storage.local.set({ [STORAGE_KEY]: state });
}

// --- Notifications ---

function notify(threshold, currentNumber) {
  console.log('[TicketMonitor BG] Notifying threshold:', threshold, 'current:', currentNumber);
  chrome.notifications.create(`threshold-${threshold}`, {
    type: 'basic',
    iconUrl: 'icon128.png',
    title: '排队进度提醒',
    message: `当前排队序号已降至 ${currentNumber}（阈值 ${threshold}），距离购票更近了！`,
    priority: 2
  }, (id) => {
    if (chrome.runtime.lastError) {
      console.error('[TicketMonitor BG] Notification error:', chrome.runtime.lastError);
    } else {
      console.log('[TicketMonitor BG] Notification sent:', id);
    }
  });
}

// --- Queue update handler ---

async function handleQueueUpdate(number) {
  const state = await getState();
  state.currentNumber = number;
  state.lastUpdate = Date.now();

  for (const threshold of THRESHOLDS) {
    if (number <= threshold && !state.notifiedThresholds.includes(threshold)) {
      console.log('[TicketMonitor BG] Threshold triggered:', threshold);
      state.notifiedThresholds.push(threshold);
      notify(threshold, number);
    }
  }

  await saveState(state);
}

// --- Message router ---

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'QUEUE_NUMBER_UPDATE') {
    handleQueueUpdate(msg.number);
    return false;
  }

  if (msg.type === 'GET_STATE') {
    getState().then(state => sendResponse(state));
    return true;
  }

  if (msg.type === 'RESET_NOTIFICATIONS') {
    getState().then(async state => {
      state.notifiedThresholds = [];
      await saveState(state);
      sendResponse({ success: true, state });
    });
    return true;
  }

  return false;
});
