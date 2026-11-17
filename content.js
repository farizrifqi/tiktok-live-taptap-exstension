// TikTok Live Clicker - Content Script

const SELECTOR = 'div[class="w-[38px] h-[38px] rounded-full flex justify-center items-center bg-UIShapeNeutral4 hover:bg-UIShapeNeutral3 cursor-pointer"]';
const MIN_DELAY = 50;
const MAX_DELAY = 250;
const PROGRESS_EVERY = 10; // clicks between progress updates

const state = {
  running: false,
  stopRequested: false,
  count: 0,      // clicks in the current round
  total: 0,      // clicks across all rounds
  round: 1,
  target: 5000,
  loop: false,
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const randomInt = (min, max) => Math.floor(Math.random() * (max - min)) + min;
const getElement = () => document.querySelector(SELECTOR);

// The popup may be closed, which makes sendMessage reject. Ignore that.
function notify(msg) {
  try {
    chrome.runtime.sendMessage(msg).catch(() => {});
  } catch (e) { /* extension context invalidated */ }
}

function snapshot() {
  return {
    count: state.count,
    total: state.total,
    round: state.round,
    target: state.target,
    loop: state.loop,
  };
}

function applyConfig(cfg = {}) {
  if (Number.isFinite(cfg.target) && cfg.target >= 1) {
    state.target = Math.floor(cfg.target);
  }
  if (typeof cfg.loop === 'boolean') {
    state.loop = cfg.loop;
  }
}

async function runClicker() {
  state.running = true;
  state.stopRequested = false;
  state.count = 0;
  state.total = 0;
  state.round = 1;

  while (!state.stopRequested) {
    // Target reached (also catches the target being lowered mid-run)
    if (state.count >= state.target) {
      if (state.loop) {
        state.round++;
        state.count = 0;
        notify({ type: 'PROGRESS', ...snapshot() });
      } else {
        state.running = false;
        notify({ type: 'DONE', ...snapshot() });
        return;
      }
    }

    const el = getElement();
    if (!el) {
      state.running = false;
      notify({ type: 'ELEMENT_GONE', ...snapshot() });
      return;
    }

    el.click();
    state.count++;
    state.total++;

    if (state.count % PROGRESS_EVERY === 0 || state.count >= state.target) {
      notify({ type: 'PROGRESS', ...snapshot() });
    }

    await sleep(randomInt(MIN_DELAY, MAX_DELAY));
  }

  state.running = false;
  state.stopRequested = false;
  notify({ type: 'STOPPED', ...snapshot() });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  switch (msg.type) {
    case 'CHECK_ELEMENT':
      sendResponse({
        exists: !!getElement(),
        isRunning: state.running && !state.stopRequested,
        ...snapshot(),
      });
      break;

    case 'START':
      applyConfig(msg);
      if (state.running) {
        // Start pressed right after Stop, before the loop exited: just resume
        state.stopRequested = false;
        sendResponse({ started: true, ...snapshot() });
      } else if (!getElement()) {
        sendResponse({ started: false, reason: 'no_element' });
      } else {
        runClicker();
        sendResponse({ started: true, ...snapshot() });
      }
      break;

    case 'SET_CONFIG':
      applyConfig(msg);
      sendResponse({ ok: true, ...snapshot() });
      break;

    case 'STOP':
      state.stopRequested = true;
      sendResponse({ stopped: true, ...snapshot() });
      break;
  }
  return true;
});
