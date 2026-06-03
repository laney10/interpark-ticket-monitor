console.log('[TicketMonitor] Content script loaded');

let lastKnownNumber = null;
let debounceTimer = null;

// --- Silent audio playback to prevent Chrome from throttling/suspending the tab ---
// Chrome exempts audio-playing tabs from aggressive throttling and discarding.
let audioCtx = null;

function startKeepAliveAudio() {
  try {
    audioCtx = new AudioContext();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    gain.gain.value = 0.001;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.value = 20;
    osc.start();
    console.log('[TicketMonitor] Keep-alive audio started (prevents tab suspension)');
  } catch (e) {
    console.warn('[TicketMonitor] Could not start keep-alive audio:', e);
  }
}

function initKeepAlive() {
  startKeepAliveAudio();
  document.removeEventListener('click', initKeepAlive);
  document.removeEventListener('keydown', initKeepAlive);
}
document.addEventListener('click', initKeepAlive);
document.addEventListener('keydown', initKeepAlive);
startKeepAliveAudio();

// --- Number extraction ---

function extractQueueNumber() {
  const strong = document.querySelector('[class*="StatusBox_mainText"] strong');
  if (strong) {
    const num = parseInt(strong.textContent.trim().replace(/,/g, ''), 10);
    if (!isNaN(num)) return num;
  }

  const h3s = document.querySelectorAll('h3');
  for (const h3 of h3s) {
    if (h3.textContent.includes('My waiting order')) {
      const container = h3.closest('[class*="StatusBox_mainText"]') || h3.parentElement;
      if (container) {
        const s = container.querySelector('strong');
        if (s) {
          const num = parseInt(s.textContent.trim().replace(/,/g, ''), 10);
          if (!isNaN(num)) return num;
        }
      }
    }
  }
  return null;
}

// --- Communication with background ---

function reportNumber(num) {
  if (num === lastKnownNumber) return;
  console.log('[TicketMonitor] Reporting:', num, '(was:', lastKnownNumber, ')');
  lastKnownNumber = num;

  chrome.runtime.sendMessage({
    type: 'QUEUE_NUMBER_UPDATE',
    number: num,
    timestamp: Date.now()
  }).catch(() => {});
}

function checkAndReport() {
  const num = extractQueueNumber();
  if (num !== null) reportNumber(num);
}

// --- MutationObserver ---

function debouncedCheck() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(checkAndReport, 300);
}

new MutationObserver(() => debouncedCheck()).observe(document.body, {
  subtree: true, childList: true, characterData: true
});

// --- 20s fallback polling ---

setInterval(checkAndReport, 20000);

// --- Initial check ---

checkAndReport();

// --- Respond to messages from background / popup ---

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'GET_CURRENT_NUMBER') {
    const num = extractQueueNumber();
    sendResponse({ number: num });
  }
});
