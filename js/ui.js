/** DOM layer: screens, HUD, modals, transitions, result animation. Talks to the game via `game` + events. */
import { CATS, END_LINES } from './config.js';
import { store } from './storage.js';
import { sfx, unlock, setMuted, isMuted, haptic } from './audio.js';
import { game } from './engine.js';

const $ = (sel, root = document) => root.querySelector(sel);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ICONS = 'img/ui/icons.svg';
const icon = (id, cls = '') => `<svg class="ic ${cls}" aria-hidden="true"><use href="${ICONS}#${id}"/></svg>`;

const app = $('#app');
const screens = { intro: $('#screen-intro'), select: $('#screen-select'), over: $('#screen-over') };
const el = {
  hud: $('#hud'), score: $('#scoreLabel'), best: $('#bestLabel'),
  combo: $('#combo'), comboX: $('#comboX'), comboTag: $('#comboTag'), comboMeter: $('#comboMeter'),
  power: $('#power'), powerMeter: $('#powerMeter'),
  countdown: $('#countdown'), hint: $('#hint'),
  pauseBtn: $('#pauseBtn'), soundBtn: $('#soundBtn'), themeBtn: $('#themeBtn'),
  wipe: $('#wipe'), toast: $('#toast'),
};

let selectedCat = Math.min(store.cat, CATS.length - 1);
let busy = false;
let lastCombo = 0;
let lastMult = 1;
let fevering = false;
let toastTimer = 0;

/* ------------------------------------------------------------------ screens & transitions */

function showScreen(name) {
  for (const [key, node] of Object.entries(screens)) node.classList.toggle('hidden', key !== name);
}

/** Paw-print iris wipe: covers the screen, runs `mid` while hidden, then reveals. */
async function transition(mid) {
  if (busy) return;
  busy = true;
  el.wipe.classList.remove('hidden');
  const cover = el.wipe.animate(
    [{ clipPath: 'circle(0% at 50% 58%)' }, { clipPath: 'circle(150% at 50% 58%)' }],
    { duration: 330, easing: 'cubic-bezier(.6,0,.3,1)', fill: 'forwards' },
  );
  await cover.finished;
  await mid();
  const reveal = el.wipe.animate(
    [{ clipPath: 'circle(150% at 50% 58%)' }, { clipPath: 'circle(0% at 50% 58%)' }],
    { duration: 400, easing: 'cubic-bezier(.3,0,.2,1)', fill: 'forwards' },
  );
  await reveal.finished;
  cover.cancel();
  reveal.cancel();
  el.wipe.classList.add('hidden');
  busy = false;
}

function toast(text) {
  el.toast.textContent = text;
  el.toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.add('hidden'), 1800);
}

function openModal(id) { $(id).classList.remove('hidden'); }
function closeModal(id) { $(id).classList.add('hidden'); }

/* ------------------------------------------------------------------ intro */

function buildIntro() {
  const words = [...document.querySelectorAll('.logo-word')];
  words.forEach((w, wi) => {
    const text = w.dataset.text;
    w.textContent = '';
    [...text].forEach((ch, i) => {
      const s = document.createElement('span');
      s.className = 'l';
      s.textContent = ch;
      s.style.setProperty('--i', String(i + wi * 3));
      s.style.setProperty('--tilt', i % 2 ? '3deg' : '-3deg');
      w.appendChild(s);
    });
  });

  const trio = $('#trio');
  [0, 1, 2].forEach((i) => {
    const c = CATS[i];
    const fig = document.createElement('figure');
    fig.className = 'cat';
    fig.innerHTML = `<img src="${c.img}" alt="${c.name}" draggable="false"><span class="tag">${c.name}</span>`;
    fig.addEventListener('click', () => {
      unlock();
      sfx.meow(c.pitch);
      haptic(10);
      fig.classList.remove('boing');
      void fig.offsetWidth;
      fig.classList.add('boing');
    });
    trio.appendChild(fig);
  });
}

/* ------------------------------------------------------------------ cat select */

function buildSelect() {
  const grid = $('#catGrid');
  CATS.forEach((c, i) => {
    const card = document.createElement('div');
    card.className = 'cat-card';
    card.setAttribute('role', 'radio');
    card.tabIndex = 0;
    card.innerHTML = `
      <span class="check">${icon('check')}</span>
      <button class="cat-info" aria-label="ดูนิสัย ${c.name}">${icon('info')}</button>
      <img src="${c.img}" alt="" draggable="false">
      <span class="name">${c.name}</span>`;
    const choose = () => {
      selectedCat = i;
      store.cat = i;
      sfx.meow(c.pitch);
      haptic(10);
      refreshSelect();
    };
    card.addEventListener('click', choose);
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(); } });
    $('.cat-info', card).addEventListener('click', (e) => { e.stopPropagation(); sfx.click(); openTrivia(i); });
    grid.appendChild(card);
  });
  refreshSelect();
}

function refreshSelect() {
  [...$('#catGrid').children].forEach((card, i) => {
    const on = i === selectedCat;
    card.setAttribute('aria-checked', String(on));
    if (on) { const im = $('img', card); im.style.animation = 'none'; void im.offsetWidth; im.style.animation = ''; }
  });
}

function openTrivia(i) {
  const c = CATS[i];
  $('#triviaImg').src = c.img;
  $('#triviaImg').alt = c.name;
  $('#triviaName').textContent = c.name;
  $('#triviaGood').innerHTML = c.pros.map((t) => `<li>${icon('check')}<span>${t}</span></li>`).join('');
  $('#triviaBad').innerHTML = c.cons.map((t) => `<li>${icon('alert')}<span>${t}</span></li>`).join('');
  openModal('#triviaModal');
}

/* ------------------------------------------------------------------ HUD */

function setScore(score) {
  const prev = Number(el.score.textContent);
  el.score.textContent = String(score);
  if (score !== prev && score > 0) {
    el.score.classList.remove('bump');
    void el.score.offsetWidth;
    el.score.classList.add('bump');
  }
}

function renderCombo() {
  const show = lastCombo >= 3 || fevering;
  el.combo.classList.toggle('on', show);
  if (!show) return;
  el.comboX.textContent = String(lastCombo);
  el.comboTag.textContent = fevering ? 'FEVER x2!' : lastMult > 1 ? `COMBO x${lastMult}` : 'COMBO!';
}

function setCombo({ combo, mult = 1 }) {
  const changed = combo !== lastCombo;
  lastCombo = combo;
  lastMult = mult;
  renderCombo();
  if (changed && combo >= 3) {
    el.comboX.classList.remove('pop');
    void el.comboX.offsetWidth;
    el.comboX.classList.add('pop');
  }
}

function setFever(on) {
  fevering = on;
  app.classList.toggle('fever', on);
  renderCombo();
}

function onFrame({ tierFrac, feverFrac, magnetFrac }) {
  if (el.combo.classList.contains('on')) {
    const f = fevering ? feverFrac : tierFrac;
    el.comboMeter.style.transform = `scaleX(${Math.max(0, f).toFixed(3)})`;
  }
  const power = magnetFrac > 0;
  el.power.classList.toggle('hidden', !power);
  if (power) el.powerMeter.style.transform = `scaleX(${magnetFrac.toFixed(3)})`;
}

function onReadyTick(label) {
  el.countdown.innerHTML = `<span class="${label === 'GO!' ? 'go' : ''}">${label}</span>`;
  if (label === 'GO!') {
    hideHint();
    setTimeout(() => { if (el.countdown.textContent === 'GO!') el.countdown.innerHTML = ''; }, 650);
  }
}

function showHint() {
  if (store.hintShown) return;
  el.hint.classList.remove('hidden');
}
function hideHint() {
  if (el.hint.classList.contains('hidden')) return;
  el.hint.classList.add('hidden');
  store.hintShown = true;
}

/* ------------------------------------------------------------------ run flow */

function enterGameChrome() {
  app.classList.add('in-game');
  el.hud.classList.remove('hidden');
  el.pauseBtn.classList.remove('hidden');
  el.best.textContent = String(store.best);
  el.score.textContent = '0';
  el.combo.classList.remove('on');
  el.power.classList.add('hidden');
  lastCombo = 0;
  lastMult = 1;
  setFever(false);
}

function leaveGameChrome() {
  app.classList.remove('in-game');
  el.hud.classList.add('hidden');
  el.pauseBtn.classList.add('hidden');
  el.combo.classList.remove('on');
  el.power.classList.add('hidden');
  el.countdown.innerHTML = '';
  setFever(false);
  hideHint();
}

function beginRun() {
  showScreen(null);
  enterGameChrome();
  game.startRun(selectedCat);
  showHint();
}

async function startFromSelect() {
  unlock();
  sfx.click();
  await transition(() => beginRun());
}

async function retry() {
  sfx.click();
  showScreen(null);
  beginRun();
}

async function quitToMenu(target = 'intro') {
  sfx.click();
  closeModal('#pauseModal');
  await transition(() => {
    game.quit();
    leaveGameChrome();
    showScreen(target);
  });
}

async function onGameOver(result) {
  await transition(() => {
    leaveGameChrome();
    fillResult(result);
    showScreen('over');
  });
  await playResult(result);
}

/* ------------------------------------------------------------------ result screen */

function fillResult({ best, isNewBest }) {
  const c = CATS[selectedCat];
  $('#finalScore').textContent = '0';
  $('#bestLine').innerHTML = `${icon('crown')}<span>สูงสุด ${best}</span>`;
  $('#newBest').classList.add('hidden');
  $('#speech').classList.add('hidden');
  $('#speechCat').src = c.img;
  $('#speechText').textContent = END_LINES[Math.floor(Math.random() * END_LINES.length)];
  $('#paws').innerHTML = [0, 1, 2].map(() => icon('paw')).join('');
  void isNewBest;
}

async function playResult({ score, rating, isNewBest }) {
  const out = $('#finalScore');
  const dur = Math.min(1100, 350 + score * 22);
  const start = performance.now();
  await new Promise((resolve) => {
    let lastTick = 0;
    const step = (now) => {
      const k = Math.min(1, (now - start) / dur);
      const v = Math.round(score * (1 - (1 - k) ** 3));
      out.textContent = String(v);
      if (v !== lastTick && v % 3 === 0) { sfx.tick(); lastTick = v; }
      if (k < 1) requestAnimationFrame(step); else resolve();
    };
    requestAnimationFrame(step);
  });

  const paws = [...$('#paws').children];
  for (let i = 0; i < rating; i++) {
    paws[i].classList.add('on');
    sfx.stamp();
    haptic(12);
    await sleep(340);
  }

  if (isNewBest && score > 0) {
    $('#newBest').classList.remove('hidden');
    sfx.fanfare();
    await sleep(450);
  }
  $('#speech').classList.remove('hidden');
  sfx.meow(CATS[selectedCat].pitch);
}

/* ------------------------------------------------------------------ leaderboard & share */

function renderBoard() {
  const list = store.top5;
  $('#boardList').innerHTML = list.length
    ? list.map((r, i) => `
        <li class="lb-row" style="--i:${i}">
          <span class="lb-rank">${i + 1}</span>
          <span class="lb-score">${r.score}<small>คะแนน</small></span>
          <span class="lb-date">${r.date || ''}</span>
        </li>`).join('')
    : '<li class="lb-empty">ยังไม่มีสถิติ ไปเล่นกันเลย!</li>';
}

async function share() {
  sfx.click();
  const score = $('#finalScore').textContent;
  const text = `ฉันได้ ${score} คะแนนใน Our Cats! 🐱 มาเล่นกันเถอะ`;
  try {
    if (navigator.share) await navigator.share({ title: 'Our Cats', text, url: location.href });
    else if (navigator.clipboard) { await navigator.clipboard.writeText(`${text} ${location.href}`); toast('คัดลอกข้อความแล้ว!'); }
  } catch {
    /* share sheet dismissed */
  }
}

/* ------------------------------------------------------------------ controls: sound, theme, pause */

function applyTheme(name, instant = false) {
  document.documentElement.dataset.theme = name;
  game.setTheme(name, instant);
  el.themeBtn.innerHTML = icon(name === 'night' ? 'moon' : 'sun');
  $('meta[name="theme-color"]')?.setAttribute('content', name === 'night' ? '#241b50' : '#ffc4d6');
}

function autoTheme() {
  const h = new Date().getHours();
  return h >= 6 && h < 18 ? 'day' : 'night';
}

function pauseGame() {
  if (!game.isRunning || game.state === 'dying') return;
  game.pause();
  openModal('#pauseModal');
}

function resumeGame() {
  closeModal('#pauseModal');
  game.resume();
}

/* ------------------------------------------------------------------ init */

export function initUI() {
  buildIntro();
  buildSelect();

  setMuted(store.muted);
  el.soundBtn.innerHTML = icon(isMuted() ? 'mute' : 'sound');
  el.soundBtn.addEventListener('click', () => {
    unlock();
    setMuted(!isMuted());
    store.muted = isMuted();
    el.soundBtn.innerHTML = icon(isMuted() ? 'mute' : 'sound');
    sfx.click();
  });

  const pref = store.theme;
  applyTheme(pref === 'auto' ? autoTheme() : pref, true);
  el.themeBtn.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'night' ? 'day' : 'night';
    store.theme = next;
    applyTheme(next);
    sfx.click();
  });

  $('#toSelectBtn').addEventListener('click', async () => { unlock(); sfx.click(); await transition(() => showScreen('select')); });
  $('#backBtn').addEventListener('click', async () => { sfx.click(); await transition(() => showScreen('intro')); });
  $('#startBtn').addEventListener('click', startFromSelect);
  $('#retryBtn').addEventListener('click', retry);
  $('#swapBtn').addEventListener('click', async () => { sfx.click(); await transition(() => showScreen('select')); });
  $('#boardBtn').addEventListener('click', () => { sfx.click(); renderBoard(); openModal('#boardModal'); });
  $('#shareBtn').addEventListener('click', share);

  el.pauseBtn.addEventListener('click', () => { sfx.click(); pauseGame(); });
  $('#resumeBtn').addEventListener('click', () => { sfx.click(); resumeGame(); });
  $('#quitBtn').addEventListener('click', () => quitToMenu('intro'));

  for (const [btn, modal] of [['#triviaClose', '#triviaModal'], ['#boardClose', '#boardModal']]) {
    $(btn).addEventListener('click', () => { sfx.click(); closeModal(modal); });
    $(modal).addEventListener('click', (e) => { if (e.target === $(modal)) closeModal(modal); });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!$('#pauseModal').classList.contains('hidden')) resumeGame(); else pauseGame();
    }
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });
  document.addEventListener('pointerdown', unlock, { once: true });

  showScreen('intro');
}

export const gameEvents = {
  onScore: setScore,
  onCombo: setCombo,
  onFever: setFever,
  onFrame,
  onReadyTick,
  onGameOver,
  onFirstMove: hideHint,
};
