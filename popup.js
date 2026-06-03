const THRESHOLDS = [1000, 500, 100];

const queueValue = document.getElementById('queueValue');
const thresholdsSection = document.getElementById('thresholdsSection');
const resetBtn = document.getElementById('resetBtn');

function formatNumber(num) {
  if (num === null || num === undefined) return '--';
  return num.toLocaleString('en-US');
}

function renderState(state) {
  // Queue number
  if (state.currentNumber !== null && state.currentNumber !== undefined) {
    queueValue.textContent = formatNumber(state.currentNumber);
    queueValue.classList.remove('unknown');
  } else {
    queueValue.textContent = '--';
    queueValue.classList.add('unknown');
  }

  // Thresholds
  thresholdsSection.innerHTML = '';
  THRESHOLDS.forEach(threshold => {
    const triggered = state.notifiedThresholds.includes(threshold);
    const row = document.createElement('div');
    row.className = 'threshold-row' + (triggered ? ' triggered' : '');
    row.innerHTML = `
      <span>≤ ${formatNumber(threshold)}</span>
      <span class="badge ${triggered ? 'done' : 'waiting'}">${triggered ? '已通知 ✓' : '等待中'}</span>
    `;
    thresholdsSection.appendChild(row);
  });
}

async function loadState() {
  // Get stored state from background
  const result = await chrome.storage.local.get('ticketMonitor');
  const state = result.ticketMonitor || {
    currentNumber: null,
    notifiedThresholds: [],
    lastUpdate: null
  };
  renderState(state);

  // Also try to get live number from content script
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_CURRENT_NUMBER' });
      if (response && response.number !== null && response.number !== undefined) {
        queueValue.textContent = formatNumber(response.number);
        queueValue.classList.remove('unknown');
      }
    }
  } catch (_e) {
    // Content script not available on this page; use stored value
  }
}

resetBtn.addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ type: 'RESET_NOTIFICATIONS' });
  loadState();
});

loadState();
