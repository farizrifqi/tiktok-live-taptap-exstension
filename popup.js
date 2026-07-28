// TikTok Live Clicker - Popup Script

const TOTAL = 5000;

let isOn = false;
let clickCount = 0;
let onTikTokLive = false;
let elementFound = false;
let activeTabId = null;

// DOM refs
const toggleWrap = document.getElementById('toggle-wrap');
const toggleSwitch = document.getElementById('toggle-switch');
const toggleLabel = document.getElementById('toggle-label');
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const urlWarning = document.getElementById('url-warning');
const progressFill = document.getElementById('progress-fill');
const countLabel = document.getElementById('count-label');
const statClicks = document.getElementById('stat-clicks');
const statRemaining = document.getElementById('stat-remaining');

function isTikTokLiveUrl(url) {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.hostname === 'www.tiktok.com' && /^\/@[^/]+\/live/.test(u.pathname);
  } catch {
    return false;
  }
}

function setStatus(state, msg) {
  statusDot.className = 'status-dot' + (state ? ` ${state}` : '');
  statusText.className = state || '';
  statusText.textContent = msg;
}

function updateProgress(count) {
  clickCount = count;
  const pct = Math.min((count / TOTAL) * 100, 100).toFixed(1);
  progressFill.style.width = pct + '%';
  countLabel.textContent = `${count} / ${TOTAL}`;
  statClicks.textContent = count;
  statRemaining.textContent = Math.max(0, TOTAL - count);
}

function setToggleEnabled(enabled) {
  if (enabled) {
    toggleWrap.classList.remove('disabled');
  } else {
    toggleWrap.classList.add('disabled');
  }
}

function setToggleOn(on) {
  isOn = on;
  if (on) {
    toggleSwitch.classList.add('on');
    toggleLabel.textContent = 'STOP CLICKER';
  } else {
    toggleSwitch.classList.remove('on');
    toggleLabel.textContent = 'START CLICKER';
  }
}

async function checkTab() {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    setStatus('error', 'No active tab');
    urlWarning.classList.add('show');
    setToggleEnabled(false);
    return;
  }

  activeTabId = tab.id;
  onTikTokLive = isTikTokLiveUrl(tab.url);

  if (!onTikTokLive) {
    urlWarning.classList.add('show');
    setStatus('error', 'Not on TikTok Live');
    setToggleEnabled(false);
    return;
  }

  urlWarning.classList.remove('show');

  // Check if content script is ready and element exists
  try {
    const response = await chrome.tabs.sendMessage(activeTabId, { type: 'CHECK_ELEMENT' });
    elementFound = response.exists;
    const alreadyRunning = response.isRunning;

    if (alreadyRunning) {
      setToggleOn(true);
      setStatus('active', 'Running…');
      setToggleEnabled(true);
    } else if (elementFound) {
      setStatus(null, 'Ready — element found');
      setToggleEnabled(true);
      setToggleOn(false);
    } else {
      setStatus('error', 'Heart button not found');
      setToggleEnabled(false);
      setToggleOn(false);
    }
  } catch (e) {
    // Content script may not have injected yet (fresh page load)
    setStatus('error', 'Page not ready — refresh');
    setToggleEnabled(false);
  }
}

// Toggle click handler
toggleWrap.addEventListener('click', async () => {
  if (toggleWrap.classList.contains('disabled')) return;
  if (!activeTabId) return;

  if (!isOn) {
    // Start
    try {
      const resp = await chrome.tabs.sendMessage(activeTabId, { type: 'START' });
      if (resp && resp.started) {
        setToggleOn(true);
        setStatus('active', 'Running…');
      } else if (resp && resp.reason === 'no_element') {
        setStatus('error', 'Heart button not found');
        setToggleEnabled(false);
      }
    } catch (e) {
      setStatus('error', 'Could not start — refresh page');
    }
  } else {
    // Stop
    try {
      await chrome.tabs.sendMessage(activeTabId, { type: 'STOP' });
    } catch (e) { /* ignore */ }
    setToggleOn(false);
    setStatus(null, 'Stopped');
  }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'PROGRESS') {
    updateProgress(msg.count);
  } else if (msg.type === 'DONE') {
    updateProgress(msg.count);
    setToggleOn(false);
    setStatus(null, `Done! ${msg.count} clicks`);
  } else if (msg.type === 'ELEMENT_GONE') {
    setToggleOn(false);
    setStatus('error', 'Heart button disappeared');
    setToggleEnabled(false);
  }
});

// Init
checkTab();
