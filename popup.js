// TikTok Live Clicker - Popup Script

const MIN_TARGET = 1;
const MAX_TARGET = 1000000;
const STORE_KEY = 'tlc-settings';

// ---------- State ----------
let settings = loadSettings();     // { target, loop }
let running = false;
let count = 0;
let round = 1;
let tabId = null;
let canStart = false;
let shownCount = 0;                // value currently displayed (for tweening)
let tweenFrame = null;

// ---------- DOM ----------
const $ = (id) => document.getElementById(id);
const dot = $('dot'), statusText = $('status-text'), roundEl = $('round'), warning = $('warning');
const countEl = $('count'), ofEl = $('of'), fill = $('fill');
const targetInput = $('target'), minus = $('minus'), plus = $('plus'), chips = $('chips');
const loopRow = $('loop-row'), loopSwitch = $('loop');
const mainBtn = $('main-btn'), mainLabel = $('main-label');

// ---------- Helpers ----------
const fmt = (n) => Number(n).toLocaleString('en-US');
const clamp = (n) => Math.min(MAX_TARGET, Math.max(MIN_TARGET, Math.floor(n) || MIN_TARGET));

function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY));
    return { target: clamp(s.target), loop: !!s.loop };
  } catch {
    return { target: 5000, loop: false };
  }
}
function saveSettings() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(settings)); } catch { /* ignore */ }
}

function isTikTokLiveUrl(url) {
  try {
    const u = new URL(url);
    return u.hostname === 'www.tiktok.com' && /^\/@[^/]+\/live/.test(u.pathname);
  } catch { return false; }
}

// Cross-fade a text node
function swapText(el, text, cls = 'swap') {
  if (el.textContent === text) return;
  el.classList.add(cls);
  setTimeout(() => { el.textContent = text; el.classList.remove(cls); }, 160);
}

function setStatus(kind, msg) {
  dot.className = 'dot' + (kind ? ' ' + kind : '');
  swapText(statusText, msg);
}

// Tween the big number so it counts up smoothly
function tweenCount(to) {
  cancelAnimationFrame(tweenFrame);
  const from = shownCount;
  if (from === to) { countEl.textContent = fmt(to); return; }
  const dur = Math.min(350, Math.abs(to - from) * 12 + 80);
  const t0 = performance.now();
  const step = (t) => {
    const p = Math.min(1, (t - t0) / dur);
    const eased = 1 - Math.pow(1 - p, 3);
    shownCount = Math.round(from + (to - from) * eased);
    countEl.textContent = fmt(shownCount);
    if (p < 1) tweenFrame = requestAnimationFrame(step);
  };
  tweenFrame = requestAnimationFrame(step);
}

// ---------- Render ----------
function renderProgress() {
  tweenCount(count);
  ofEl.textContent = `of ${fmt(settings.target)}`;
  fill.style.width = Math.min(100, (count / settings.target) * 100) + '%';
}

function renderRound() {
  const show = settings.loop && (running || round > 1);
  roundEl.textContent = `Round ${round}`;
  roundEl.classList.toggle('show', show);
}

function renderTarget() {
  targetInput.value = settings.target;
  chips.querySelectorAll('.chip').forEach((c) =>
    c.classList.toggle('on', Number(c.dataset.v) === settings.target));
  renderProgress();
}

function renderLoop() {
  loopSwitch.setAttribute('aria-checked', String(settings.loop));
  renderRound();
}

function renderButton() {
  mainBtn.classList.toggle('running', running);
  mainBtn.disabled = !running && !canStart;
  swapText(mainLabel, running ? 'Stop' : (count >= settings.target && count > 0 ? 'Start again' : 'Start'));
}

function setRunning(on) {
  running = on;
  renderButton();
  renderRound();
}

// ---------- Messaging ----------
async function send(msg) {
  if (tabId == null) return null;
  try { return await chrome.tabs.sendMessage(tabId, msg); } catch { return null; }
}

function pushConfig() {
  if (running) send({ type: 'SET_CONFIG', target: settings.target, loop: settings.loop });
}

// ---------- Settings handlers ----------
function setTarget(v) {
  settings.target = clamp(v);
  saveSettings();
  renderTarget();
  renderButton();
  pushConfig();
}

function stepSize(v) { return v >= 10000 ? 1000 : v >= 1000 ? 500 : 100; }

minus.addEventListener('click', () => setTarget(settings.target - stepSize(settings.target - 1)));
plus.addEventListener('click', () => setTarget(settings.target + stepSize(settings.target)));
chips.addEventListener('click', (e) => {
  const c = e.target.closest('.chip');
  if (c) setTarget(Number(c.dataset.v));
});
targetInput.addEventListener('change', () => setTarget(targetInput.valueAsNumber));
targetInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') targetInput.blur(); });

function toggleLoop() {
  settings.loop = !settings.loop;
  saveSettings();
  renderLoop();
  pushConfig();
}
loopRow.addEventListener('click', toggleLoop);
loopSwitch.addEventListener('click', (e) => { e.stopPropagation(); toggleLoop(); });

// ---------- Start / Stop ----------
mainBtn.addEventListener('click', async () => {
  if (mainBtn.disabled) return;

  if (!running) {
    const resp = await send({ type: 'START', target: settings.target, loop: settings.loop });
    if (resp && resp.started) {
      count = resp.count || 0;
      round = resp.round || 1;
      setRunning(true);
      setStatus('active', 'Running');
      renderProgress();
    } else if (resp && resp.reason === 'no_element') {
      canStart = false;
      setStatus('error', 'Heart button not found');
      renderButton();
    } else {
      setStatus('error', 'Could not start. Refresh the page');
    }
  } else {
    await send({ type: 'STOP' });
    setRunning(false);
    setStatus(null, 'Stopped');
  }
});

// Progress from the content script
chrome.runtime.onMessage.addListener((msg) => {
  if (!msg || !msg.type) return;
  if (msg.type === 'PROGRESS') {
    count = msg.count; round = msg.round;
    renderProgress(); renderRound();
  } else if (msg.type === 'DONE') {
    count = msg.count; round = msg.round;
    renderProgress();
    setRunning(false);
    setStatus('done', `Done, ${fmt(msg.total)} clicks`);
  } else if (msg.type === 'ELEMENT_GONE') {
    canStart = false;
    setRunning(false);
    setStatus('error', 'Heart button disappeared');
  }
});

// ---------- Init ----------
async function init() {
  renderTarget();
  renderLoop();
  renderButton();

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !isTikTokLiveUrl(tab.url)) {
    warning.classList.add('show');
    setStatus('error', 'Not on a TikTok live');
    return;
  }
  tabId = tab.id;

  const resp = await send({ type: 'CHECK_ELEMENT' });
  if (!resp) { setStatus('error', 'Page not ready. Refresh it'); return; }

  if (resp.isRunning) {
    // Popup reopened mid-run: adopt the live state
    settings.target = clamp(resp.target);
    settings.loop = !!resp.loop;
    count = resp.count; round = resp.round;
    canStart = true;
    shownCount = count;
    renderTarget(); renderLoop();
    setRunning(true);
    setStatus('active', 'Running');
  } else if (resp.exists) {
    canStart = true;
    renderButton();
    setStatus(null, 'Ready');
  } else {
    setStatus('error', 'Heart button not found');
  }
}
init();
