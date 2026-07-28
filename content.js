// TikTok Live Clicker - Content Script

const TOTAL = 5000;
const SELECTOR = 'div[class="w-[38px] h-[38px] rounded-full flex justify-center items-center bg-UIShapeNeutral4 hover:bg-UIShapeNeutral3 cursor-pointer"]';

let isRunning = false;
let stopRequested = false;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function getRandomInt(min, max) {
  const minCeiled = Math.ceil(min);
  const maxFloored = Math.floor(max);
  return Math.floor(Math.random() * (maxFloored - minCeiled) + minCeiled);
}

function elementExists() {
  return !!document.querySelector(SELECTOR);
}

async function runClicker() {
  isRunning = true;
  stopRequested = false;
  let i = 0;

  while (i <= TOTAL && !stopRequested) {
    const el = document.querySelector(SELECTOR);
    if (!el) {
      // Element disappeared mid-run, stop and notify
      isRunning = false;
      chrome.runtime.sendMessage({ type: 'ELEMENT_GONE' });
      return;
    }

    el.click();
    console.log("stack", i);
    i++;

    if (i % 500 === 0) {
      console.log("sent");
      await sleep(getRandomInt(50, 250));
    } else {
      await sleep(getRandomInt(50, 250));
    }

    // Send progress updates every 100 clicks
    if (i % 100 === 0) {
      chrome.runtime.sendMessage({ type: 'PROGRESS', count: i, total: TOTAL });
    }
  }

  isRunning = false;
  stopRequested = false;
  chrome.runtime.sendMessage({ type: 'DONE', count: i });
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'CHECK_ELEMENT') {
    sendResponse({ exists: elementExists(), isRunning });
  } else if (msg.type === 'START') {
    if (!isRunning && elementExists()) {
      runClicker();
      sendResponse({ started: true });
    } else if (!elementExists()) {
      sendResponse({ started: false, reason: 'no_element' });
    } else {
      sendResponse({ started: false, reason: 'already_running' });
    }
  } else if (msg.type === 'STOP') {
    stopRequested = true;
    isRunning = false;
    sendResponse({ stopped: true });
  }
  return true; // keep channel open for async sendResponse
});
