/** Game simulation + canvas rendering. Knows nothing about the DOM beyond the canvas:
    the UI layer talks to it through `events` callbacks and the exported `game` API. */
import { TUNING, ITEM_DEFS, CATS, INK } from './config.js';
import { scene } from './scene.js';
import { img, clamp, lerp, rand, ease, starPath, heartPath, outlinedText } from './art.js';
import { sfx, haptic } from './audio.js';
import { store } from './storage.js';

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const FONT = '"Lilita One","Mali",system-ui,sans-serif';
const GOOD = Object.keys(ITEM_DEFS).filter((k) => ITEM_DEFS[k].kind === 'good');
const BAD = Object.keys(ITEM_DEFS).filter((k) => ITEM_DEFS[k].kind === 'bad');
const READY_LABELS = ['3', '2', '1', 'GO!'];
const SPARK_COLORS = ['#ffd36e', '#ff6b8b', '#8fd8b5', '#ffffff'];

let canvas, ctx, ev = {};
let W = 0, H = 0, DPR = 1, lastTs = 0;

const g = {
  state: 'menu', prev: 'menu', t: 0,
  cat: 0, player: null,
  items: [], fx: [], pops: [],
  score: 0, combo: 0, maxCombo: 0, magnetT: 0, feverT: 0, nextFever: 10, queue: [],
  speed: 1, spawnT: 0, sincePower: 0,
  shake: 0, flash: 0, hitStop: 0, timeScale: 1,
  readyT: 0, readyIdx: -1, dyingT: 0,
  keys: { left: false, right: false }, moved: false,
};

/* ------------------------------------------------------------------ setup */

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.round(W * DPR);
  canvas.height = Math.round(H * DPR);
  scene.resize(W, H);
  if (g.player) layoutPlayer();
}

function layoutPlayer() {
  const p = g.player;
  const size = clamp(H * 0.145, 72, 128);
  p.w = p.h = size;
  p.baseY = scene.groundTopY + scene.groundH * 0.34;
  p.x = clamp(p.x, size / 2, W - size / 2);
  p.targetX = clamp(p.targetX, size / 2, W - size / 2);
}

function makePlayer() {
  g.player = { x: W / 2, targetX: W / 2, vx: 0, w: 0, h: 0, baseY: 0, hop: 0, hopV: 0, sq: 0, sqV: 0, tilt: 0, dust: 0 };
  layoutPlayer();
}

const landY = () => g.player.baseY + g.player.h * 0.32;
const feetY = () => g.player.baseY + g.player.h * 0.5;

/* ------------------------------------------------------------------ effects */

function addFx(o) {
  if (g.fx.length > 240) return;
  g.fx.push({ life: 0.6, max: 0.6, vx: 0, vy: 0, ay: 0, size: 8, rot: 0, vr: 0, color: '#fff', type: 'dot', front: true, ...o });
}

function burst(x, y, { n = 8, type = 'star', colors = SPARK_COLORS, speed = [120, 300], life = [0.45, 0.85], size = [6, 12], ay = 520, front = true } = {}) {
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + rand(-Math.PI * 0.62, Math.PI * 0.62);
    const sp = rand(speed[0], speed[1]);
    const l = rand(life[0], life[1]);
    addFx({
      type, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, ay, life: l, max: l,
      size: rand(size[0], size[1]), rot: rand(0, 6.28), vr: rand(-6, 6),
      color: colors[Math.floor(Math.random() * colors.length)], front,
    });
  }
}

function addPop(text, x, y, { color = '#fff', size = 34, life = 0.95 } = {}) {
  g.pops.push({ text, x, y, color, size, life, max: life });
}

/* ------------------------------------------------------------------ run lifecycle */

function startRun(catIdx) {
  g.cat = catIdx;
  g.items.length = 0;
  g.fx.length = 0;
  g.pops.length = 0;
  Object.assign(g, {
    score: 0, combo: 0, maxCombo: 0, magnetT: 0, feverT: 0, nextFever: TUNING.feverAt, queue: [], speed: 1, spawnT: 0.2, sincePower: 0,
    shake: 0, flash: 0, hitStop: 0, timeScale: 1, readyT: 0, readyIdx: -1, dyingT: 0, moved: false,
    state: 'ready',
  });
  makePlayer();
  scene.setFever(false);
  ev.onScore?.(0);
  ev.onCombo?.({ combo: 0 });
}

function finishRun() {
  g.state = 'over';
  const { list, isNewBest } = store.addScore(g.score);
  const rating = TUNING.ratingSteps.filter((s) => g.score >= s).length;
  g.items.length = 0;
  ev.onGameOver?.({ score: g.score, best: list[0].score, isNewBest, rating, maxCombo: g.maxCombo });
}

/* ------------------------------------------------------------------ spawning & catching */

function pickWeighted(keys) {
  const total = keys.reduce((s, k) => s + ITEM_DEFS[k].weight, 0);
  let r = Math.random() * total;
  for (const k of keys) { r -= ITEM_DEFS[k].weight; if (r <= 0) return k; }
  return keys[0];
}

const tierOf = (combo) => TUNING.tiers.filter((t) => combo >= t).length + 1;

/** Progress (0..1) toward the next multiplier tier. */
function tierFrac(combo) {
  const t = TUNING.tiers;
  const k = tierOf(combo) - 1;
  if (k >= t.length) return 1;
  const lo = k === 0 ? 0 : t[k - 1];
  return (combo - lo) / (t[k] - lo);
}

function makeItem(type, x, vy, extra = {}) {
  const size = clamp(g.player.h * 0.5, 36, 64) * rand(0.97, 1.06);
  g.items.push({
    type, kind: ITEM_DEFS[type].kind,
    x: clamp(x, size * 0.6, W - size * 0.6), y: -size,
    vx: 0, vy, size, phase: rand(0, 6.28), tilt: rand(-0.2, 0.2),
    age: 0, state: 'fall', alpha: 1, landT: 0, trail: 0, gold: false, ...extra,
  });
}

function pickType() {
  if (g.magnetT <= 0 && g.score >= 3 && g.sincePower > 14 && Math.random() < 0.08) { g.sincePower = 0; return 'magnet'; }
  const badChance = g.feverT > 0 ? 0 : 0.2 + Math.min(g.score * 0.002, 0.1);
  return Math.random() < badChance ? pickWeighted(BAD) : pickWeighted(GOOD);
}

/** One random item (the old, unpredictable feel between patterns). */
function spawnSingle() {
  const type = pickType();
  const vx = ITEM_DEFS[type].kind === 'bad' ? rand(-14, 14) : 0;
  makeItem(type, rand(0, W), rand(TUNING.fallSpeed[0], TUNING.fallSpeed[1]) * g.speed, { vx });
}

/** A scheduled trail of treats you can sweep through in one smooth motion. Returns its duration. */
function spawnPattern() {
  const vy = 165 * g.speed;
  const type = pickWeighted(GOOD);
  const step = 0.3 / Math.max(1, g.speed * 0.85);
  const shape = ['diagonal', 'zigzag', 'wave', 'column'][Math.floor(Math.random() * 4)];
  const n = shape === 'column' ? 3 : shape === 'diagonal' ? 5 : 6;
  const gap = shape === 'column' ? 0.2 : step;
  const margin = Math.min(W * 0.18, 80);
  const dir = Math.random() < 0.5 ? 1 : -1;
  const amp = Math.min(W * 0.3, 120);
  const x0 = shape === 'diagonal' ? (dir > 0 ? margin : W - margin) : rand(margin + amp, Math.max(margin + amp, W - margin - amp));
  for (let i = 0; i < n; i++) {
    let x = x0;
    if (shape === 'diagonal') x = x0 + dir * i * ((W - margin * 2) / (n - 1));
    else if (shape === 'zigzag') x = x0 + (i % 2 ? amp : -amp);
    else if (shape === 'wave') x = x0 + Math.sin(i * 1.05) * amp;
    g.queue.push({ t: i * gap, type, x, vy });
  }
  return n * gap;
}

function scheduleNext(extra = 0) {
  const base = Math.max(0.38, 0.95 - g.speed * 0.06) * (g.feverT > 0 ? 0.6 : 1);
  g.spawnT = base + extra;
}

function runSpawner(dt) {
  if (g.queue.length) {
    for (const q of g.queue) q.t -= dt;
    while (g.queue.length && g.queue[0].t <= 0) {
      const q = g.queue.shift();
      makeItem(q.type, q.x, q.vy);
    }
    return;
  }
  g.spawnT -= dt;
  if (g.spawnT > 0) return;
  const patternChance = g.feverT > 0 ? 0.7 : g.score >= 4 ? 0.4 : 0;
  if (Math.random() < patternChance) { spawnPattern(); scheduleNext(0.15); }
  else { spawnSingle(); scheduleNext(); }
}

function startFever() {
  const p = g.player;
  g.feverT = TUNING.feverDuration;
  g.nextFever = g.combo + TUNING.feverEvery;
  scene.setFever(true);
  sfx.fever();
  haptic([20, 30, 20, 30, 40]);
  g.flash = 0.6;
  g.shake = Math.max(g.shake, reduceMotion ? 0 : 9);
  for (const it of g.items) {
    if (it.kind === 'bad') { it.kind = 'good'; it.type = 'cookie'; it.gold = true; it.vx = 0; }
  }
  addPop('FEVER!', W / 2, H * 0.34, { color: '#ffd36e', size: 64, life: 1.4 });
  burst(p.x, p.baseY - p.h * 0.5, { n: 16, colors: ['#ffd36e', '#ff6b8b', '#8fd8b5', '#8ed1f0', '#ffffff'], size: [9, 16], speed: [200, 460] });
  addFx({ type: 'ring', x: p.x, y: p.baseY, size: p.w * 2.4, life: 0.7, max: 0.7, color: '#ffd36e' });
  ev.onFever?.(true);
}

function endFever() {
  g.feverT = 0;
  scene.setFever(false);
  addPop('จบ FEVER', W / 2, H * 0.34, { color: '#ffffff', size: 34, life: 1 });
  ev.onFever?.(false);
}

function breakCombo(it) {
  if (g.feverT > 0 || g.combo === 0) return;
  const lost = g.combo;
  g.combo = 0;
  g.nextFever = TUNING.feverAt;
  if (lost >= 3) {
    sfx.miss();
    addPop(`คอมโบขาด! ${lost}`, clamp(it.x, 90, W - 90), it.y - 24, { color: '#d8cfe6', size: 26, life: 1.1 });
  }
  ev.onCombo?.({ combo: 0, broken: lost >= 3 });
}

function onCatch(it) {
  const p = g.player;
  const prevTier = tierOf(g.combo);
  g.combo += 1;
  g.maxCombo = Math.max(g.maxCombo, g.combo);
  const mult = tierOf(g.combo);
  const fever = g.feverT > 0;
  const gain = mult * (fever ? 2 : 1);
  g.score += gain;

  p.sqV = -7;
  if (p.hop === 0) p.hopV = -250;
  sfx.catch(g.combo, fever);
  haptic(8);

  const color = fever ? '#ffd36e' : mult >= 3 ? '#ff6b8b' : mult === 2 ? '#ffd36e' : '#ffffff';
  addPop(`+${gain}`, it.x, it.y - 10, { color, size: 30 + mult * 4 + (fever ? 6 : 0) });
  burst(it.x, it.y, { n: 6 + mult * 2 + (fever ? 4 : 0) });
  if (g.combo >= 2) addFx({ type: 'ring', x: p.x, y: p.baseY, size: p.w * (0.9 + mult * 0.1), life: 0.4, max: 0.4, color: '#ffd36e' });

  if (mult > prevTier) {
    sfx.tier();
    g.shake = Math.max(g.shake, reduceMotion ? 0 : 7);
    addPop(`x${mult}!`, p.x, p.baseY - p.h * 1.5, { color: '#ff6b8b', size: 52, life: 1 });
    burst(p.x, p.baseY - p.h * 0.4, { n: 8, type: 'heart', colors: ['#ff6b8b', '#ffc4d6'], size: [10, 16], speed: [100, 240] });
  }

  if (it.type === 'magnet') {
    g.magnetT = TUNING.magnetDuration;
    sfx.magnet();
    addPop('แม่เหล็ก!', p.x, p.baseY - p.h * 0.85, { color: '#ffd36e', size: 30, life: 1.1 });
    addFx({ type: 'ring', x: p.x, y: p.baseY, size: p.w * 1.6, life: 0.6, max: 0.6, color: '#ff5a6e' });
  }

  ev.onScore?.(g.score);
  ev.onCombo?.({ combo: g.combo, mult, tierUp: mult > prevTier });
  if (!fever && g.combo >= g.nextFever) startFever();
}

function onBadHit(it) {
  const p = g.player;
  g.state = 'dying';
  g.dyingT = 0;
  g.hitStop = 0.1;
  g.shake = reduceMotion ? 4 : 18;
  g.flash = 1;
  g.combo = 0;
  g.feverT = 0;
  g.nextFever = TUNING.feverAt;
  g.queue.length = 0;
  scene.setFever(false);
  p.sqV = -9;
  sfx.bad();
  haptic([40, 30, 60]);
  burst(it.x, it.y, { n: 10, type: 'smoke', colors: ['#7d6a99', '#a59bb8', '#ffffff'], size: [14, 26], speed: [60, 180], ay: -40, life: [0.5, 0.9], front: false });
  burst(it.x, it.y, { n: 9, colors: ['#ff5a6e', '#ffd36e', '#ffffff'], size: [8, 15], speed: [180, 380] });
  addFx({ type: 'ring', x: it.x, y: it.y, size: 70, life: 0.45, max: 0.45, color: '#ff5a6e' });
  g.items = g.items.filter((x) => x !== it);
  ev.onCombo?.({ combo: 0 });
  ev.onFever?.(false);
}

/* ------------------------------------------------------------------ update */

function update(raw) {
  if (g.state === 'paused') return;

  let dt = raw;
  if (g.hitStop > 0) { g.hitStop -= raw; dt = 0; }
  dt *= g.timeScale;
  g.t += raw;

  const active = g.state === 'ready' || g.state === 'playing' || g.state === 'dying';
  scene.parallaxTarget = active && g.player ? clamp((g.player.x - W / 2) / (W / 2), -1, 1) : 0;
  scene.update(raw);

  if (g.player && active) updatePlayer(dt);

  if (g.state === 'ready') {
    g.readyT += raw;
    const idx = Math.min(3, Math.floor(g.readyT / TUNING.readyStep));
    if (idx !== g.readyIdx) {
      g.readyIdx = idx;
      sfx.countdown(idx === 3);
      ev.onReadyTick?.(READY_LABELS[idx], idx);
    }
    if (g.readyT >= TUNING.readyStep * 3 + 0.14) { g.state = 'playing'; g.spawnT = 0.15; }
  }

  if (g.state === 'playing') updatePlaying(dt);
  if (g.state === 'dying') {
    g.dyingT += raw;
    g.timeScale = g.dyingT < 0.3 ? 0.25 : 1;
    updateItems(dt, false);
    if (g.dyingT > 1.2) { g.timeScale = 1; finishRun(); }
  }

  updateFx(dt || raw * 0.2);
  g.shake = Math.max(0, g.shake - raw * 34);
  g.flash = Math.max(0, g.flash - raw * 2.6);

  if (g.state === 'playing' || g.state === 'ready') {
    ev.onFrame?.({
      state: g.state, combo: g.combo,
      tierFrac: tierFrac(g.combo),
      feverFrac: g.feverT / TUNING.feverDuration,
      magnetFrac: g.magnetT / TUNING.magnetDuration,
    });
  }
}

function updatePlayer(dt) {
  const p = g.player;
  if (g.state !== 'dying') {
    if (g.keys.left) p.targetX -= dt * 560;
    if (g.keys.right) p.targetX += dt * 560;
    p.targetX = clamp(p.targetX, p.w / 2, W - p.w / 2);
    const nx = p.x + (p.targetX - p.x) * Math.min(1, dt * 13);
    p.vx = lerp(p.vx, (nx - p.x) / Math.max(dt, 0.001), Math.min(1, dt * 10));
    p.x = nx;
  } else {
    p.vx *= 0.9;
  }
  p.tilt = lerp(p.tilt, clamp(p.vx / 1100, -0.3, 0.3), Math.min(1, dt * 12));

  // damped spring drives squash & stretch
  p.sqV += (-190 * p.sq - 11 * p.sqV) * dt;
  p.sq += p.sqV * dt;

  if (p.hop < 0 || p.hopV < 0) {
    p.hopV += 1700 * dt;
    p.hop += p.hopV * dt;
    if (p.hop >= 0) { p.hop = 0; p.hopV = 0; p.sqV -= 2.4; }
  }

  if (g.state === 'playing' && Math.abs(p.vx) > 380) {
    p.dust -= dt;
    if (p.dust <= 0) {
      p.dust = 0.07;
      addFx({
        type: 'smoke', x: p.x - Math.sign(p.vx) * p.w * 0.25, y: feetY() - 4, vx: -p.vx * 0.05, vy: -22,
        size: rand(5, 9), life: 0.4, max: 0.4, color: '#ffffff', front: false,
      });
    }
  }
}

function updatePlaying(dt) {
  g.speed = Math.min(TUNING.speedCap, g.speed + dt * TUNING.speedGain);
  g.sincePower += dt;
  if (g.magnetT > 0) g.magnetT = Math.max(0, g.magnetT - dt);
  if (g.feverT > 0) {
    g.feverT -= dt;
    if (Math.random() < dt * 14) {
      addFx({
        type: 'star', x: rand(0, W), y: -10, vx: rand(-30, 30), vy: rand(60, 140), ay: 120, life: 1.6, max: 1.6,
        size: rand(7, 13), rot: rand(0, 6), vr: rand(-4, 4), front: false,
        color: ['#ffd36e', '#ff6b8b', '#8fd8b5', '#8ed1f0', '#ffffff'][Math.floor(Math.random() * 5)],
      });
    }
    if (g.feverT <= 0) endFever();
  }
  runSpawner(dt);
  updateItems(dt, true);
}

function updateItems(dt, collide) {
  const p = g.player;
  const magnet = g.magnetT > 0;
  const ly = landY();

  for (let i = g.items.length - 1; i >= 0; i--) {
    const it = g.items[i];
    it.age += dt;

    if (it.state === 'fall') {
      it.y += it.vy * dt;
      it.x += it.vx * dt;
      if (magnet && it.kind !== 'bad' && collide) {
        it.x += (p.x - it.x) * Math.min(1, dt * 3.2);
        it.trail -= dt;
        if (it.trail <= 0) { it.trail = 0.05; addFx({ type: 'dot', x: it.x, y: it.y, size: 4, life: 0.3, max: 0.3, color: '#ff8fa3', front: false }); }
      }

      if (collide) {
        const top = p.baseY - p.h * 0.5 + p.hop;
        const reach = p.w * 0.46 + it.size * 0.12;
        if (it.y + it.size * 0.32 > top && it.y < p.baseY + p.h * 0.12 && Math.abs(it.x - p.x) < reach) {
          if (it.kind === 'bad') { onBadHit(it); return; }
          onCatch(it);
          g.items.splice(i, 1);
          continue;
        }
      }

      if (it.y >= ly) {
        it.state = 'land';
        it.y = ly;
        it.vy = it.kind === 'bad' ? 0 : -220;
        if (it.kind !== 'bad' && collide) breakCombo(it);
        if (it.kind === 'bad') burst(it.x, ly, { n: 4, type: 'smoke', colors: ['#a59bb8', '#ffffff'], size: [8, 14], speed: [20, 70], ay: -30, front: false });
      }
    } else {
      it.landT += dt;
      it.vy += 1500 * dt;
      it.y += it.vy * dt;
      if (it.y > ly) { it.y = ly; it.vy = Math.abs(it.vy) > 80 ? -it.vy * 0.3 : 0; }
      it.alpha = clamp(1 - (it.landT - 0.35) / 0.4, 0, 1);
      if (it.landT > 0.8) g.items.splice(i, 1);
    }
  }
}

function updateFx(dt) {
  for (let i = g.fx.length - 1; i >= 0; i--) {
    const f = g.fx[i];
    f.life -= dt;
    if (f.life <= 0) { g.fx.splice(i, 1); continue; }
    f.vy += f.ay * dt;
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    f.rot += f.vr * dt;
  }
  for (let i = g.pops.length - 1; i >= 0; i--) {
    const p = g.pops[i];
    p.life -= dt;
    p.y -= 62 * dt;
    if (p.life <= 0) g.pops.splice(i, 1);
  }
}

/* ------------------------------------------------------------------ render */

function render() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.save();
  if (g.shake > 0.1) ctx.translate(rand(-g.shake, g.shake), rand(-g.shake, g.shake));

  scene.draw(ctx);

  const showPlayer = g.player && (g.state === 'ready' || g.state === 'playing' || g.state === 'paused' || g.state === 'dying');
  drawItemShadows();
  drawFx(false);
  drawItems();
  if (showPlayer) drawPlayer();
  drawFx(true);
  drawPops();
  ctx.restore();

  if (g.magnetT > 0) drawMagnetVignette();
  if (g.flash > 0) {
    ctx.fillStyle = `rgba(255,70,100,${(g.flash * 0.4).toFixed(3)})`;
    ctx.fillRect(0, 0, W, H);
  }
}

function drawItemShadows() {
  const ly = landY();
  for (const it of g.items) {
    if (it.state !== 'fall' || it.y < 0) continue;
    const k = clamp(it.y / ly, 0, 1);
    const w = it.size * (0.28 + 0.5 * k);
    ctx.fillStyle = it.kind === 'bad' ? `rgba(200,30,70,${0.1 + 0.26 * k})` : `rgba(74,44,58,${0.07 + 0.2 * k})`;
    ctx.beginPath();
    ctx.ellipse(it.x, ly + it.size * 0.34, w, w * 0.3, 0, 0, 6.283);
    ctx.fill();
  }
}

function drawItems() {
  for (const it of g.items) {
    const im = img(`item:${it.type}`);
    if (!im) continue;
    let s = it.age < 0.25 ? ease.outBack(it.age / 0.25) : 1;
    if (it.kind === 'bad') s *= 1 + Math.sin(it.age * 9) * 0.04;
    let sx = s, sy = s;
    if (it.state === 'land') { const q = Math.max(0, 1 - it.landT * 4); sx *= 1 + 0.18 * q; sy *= 1 - 0.2 * q; }
    ctx.save();
    ctx.globalAlpha = it.alpha;
    ctx.translate(it.x, it.y);
    ctx.rotate(Math.sin(it.age * 3.2 + it.phase) * 0.22 + it.tilt);
    ctx.scale(sx, sy);
    if (it.gold) {
      const pulse = 0.5 + 0.5 * Math.sin(g.t * 10 + it.phase);
      ctx.fillStyle = `rgba(255,211,110,${(0.4 + 0.25 * pulse).toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(0, 0, it.size * (0.62 + 0.08 * pulse), 0, 6.283);
      ctx.fill();
    }
    ctx.drawImage(im, -it.size / 2, -it.size / 2, it.size, it.size);
    ctx.restore();
  }
}

function drawPlayer() {
  const p = g.player;
  const im = img(`cat:${CATS[g.cat].id}`);
  if (!im) return;
  const fy = feetY();

  // ground contact shadow
  const lift = clamp(-p.hop / 60, 0, 1);
  ctx.fillStyle = `rgba(74,44,58,${(0.24 - lift * 0.1).toFixed(3)})`;
  ctx.beginPath();
  ctx.ellipse(p.x, fy - 2, p.w * 0.42 * (1 - lift * 0.3) * (1 + p.sq * 0.25), p.w * 0.1, 0, 0, 6.283);
  ctx.fill();

  if (g.feverT > 0) {
    const pulse = 0.5 + 0.5 * Math.sin(g.t * 12);
    const r = p.w * (0.78 + 0.08 * pulse);
    const glow = ctx.createRadialGradient(p.x, p.baseY, r * 0.3, p.x, p.baseY, r * 1.35);
    glow.addColorStop(0, 'rgba(255,236,150,0.75)');
    glow.addColorStop(1, 'rgba(255,211,110,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(p.x, p.baseY, r * 1.35, 0, 6.283);
    ctx.fill();
  }

  if (g.magnetT > 0) {
    const a = g.magnetT < 1 ? 0.4 + 0.5 * Math.abs(Math.sin(g.t * 14)) : 0.9;
    ctx.save();
    ctx.translate(p.x, p.baseY);
    ctx.rotate(g.t * 2);
    ctx.setLineDash([10, 10]);
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = `rgba(255,90,110,${a.toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(0, 0, p.w * 0.8, 0, 6.283);
    ctx.stroke();
    ctx.restore();
  }

  const breath = Math.sin(g.t * 4.2) * 0.02;
  const dizzy = g.state === 'dying' ? Math.sin(g.dyingT * 18) * 0.22 : 0;
  ctx.save();
  ctx.translate(p.x, fy + p.hop);
  ctx.rotate(p.tilt + dizzy);
  ctx.scale(1 - p.sq * 0.7 - breath * 0.6, 1 + p.sq + breath);
  const d = p.w * 1.16;
  ctx.drawImage(im, -d / 2, -d + 6, d, d);
  ctx.restore();

  if (g.state === 'dying') {
    for (let i = 0; i < 3; i++) {
      const a = g.dyingT * 7 + (i * Math.PI * 2) / 3;
      const x = p.x + Math.cos(a) * p.w * 0.5;
      const y = p.baseY - p.h * 0.62 + Math.sin(a) * p.h * 0.12;
      starPath(ctx, x, y, 9, g.dyingT * 4, 4, 0.45);
      ctx.fillStyle = '#ffd36e';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = INK;
      ctx.stroke();
    }
  }
}

function drawFx(front) {
  for (const f of g.fx) {
    if (!!f.front !== front) continue;
    const k = f.life / f.max;
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.rot);
    switch (f.type) {
      case 'star': {
        const s = f.size * (0.4 + 0.6 * k);
        ctx.globalAlpha = Math.min(1, k * 2.2);
        starPath(ctx, 0, 0, s, 0, 4, 0.45);
        ctx.fillStyle = f.color;
        ctx.fill();
        if (f.size > 7) { ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.strokeStyle = INK; ctx.stroke(); }
        break;
      }
      case 'heart': {
        const s = f.size * (0.5 + 0.5 * k);
        ctx.globalAlpha = Math.min(1, k * 2);
        heartPath(ctx, 0, 0, s * 0.6);
        ctx.fillStyle = f.color;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = INK;
        ctx.stroke();
        break;
      }
      case 'smoke':
        ctx.globalAlpha = k * 0.75;
        ctx.fillStyle = f.color;
        ctx.beginPath();
        ctx.arc(0, 0, f.size * (1.9 - k), 0, 6.283);
        ctx.fill();
        break;
      case 'ring':
        ctx.globalAlpha = k;
        ctx.lineWidth = 2 + 5 * k;
        ctx.strokeStyle = f.color;
        ctx.beginPath();
        ctx.arc(0, 0, f.size * (1.25 - k * 0.55), 0, 6.283);
        ctx.stroke();
        break;
      default:
        ctx.globalAlpha = k;
        ctx.fillStyle = f.color;
        ctx.beginPath();
        ctx.arc(0, 0, f.size * k + 1, 0, 6.283);
        ctx.fill();
    }
    ctx.restore();
  }
}

function drawPops() {
  for (const p of g.pops) {
    const age = p.max - p.life;
    const s = ease.outBack(clamp(age / 0.18, 0, 1));
    const a = clamp(p.life / (p.max * 0.3), 0, 1);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(p.x, p.y);
    ctx.scale(s, s);
    outlinedText(ctx, p.text, 0, 0, { font: `${p.size}px ${FONT}`, fill: p.color, lw: 7, drop: 3 });
    ctx.restore();
  }
}

function drawMagnetVignette() {
  const pulse = 0.5 + 0.5 * Math.sin(g.t * 6);
  const grad = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
  grad.addColorStop(0, 'rgba(255,90,110,0)');
  grad.addColorStop(1, `rgba(255,90,110,${(0.16 + 0.1 * pulse).toFixed(3)})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
}

/* ------------------------------------------------------------------ loop & input */

function frame(ts) {
  requestAnimationFrame(frame);
  const raw = Math.min(0.05, (ts - (lastTs || ts)) / 1000);
  lastTs = ts;
  update(raw);
  render();
}

function setTarget(x) {
  if (g.state !== 'ready' && g.state !== 'playing') return;
  g.player.targetX = x;
  if (!g.moved) { g.moved = true; ev.onFirstMove?.(); }
}

function bindInput() {
  canvas.addEventListener('pointerdown', (e) => { setTarget(e.clientX); canvas.setPointerCapture?.(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => setTarget(e.clientX));
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a') g.keys.left = true;
    if (e.key === 'ArrowRight' || e.key === 'd') g.keys.right = true;
  });
  window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a') g.keys.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd') g.keys.right = false;
  });
  window.addEventListener('resize', resize);
}

/* ------------------------------------------------------------------ public API */

export const game = {
  init(c, events = {}) {
    canvas = c;
    ctx = canvas.getContext('2d');
    ev = events;
    resize();
    makePlayer();
    bindInput();
    requestAnimationFrame(frame);
  },
  startRun,
  pause() { if (g.state === 'ready' || g.state === 'playing') { g.prev = g.state; g.state = 'paused'; } },
  resume() { if (g.state === 'paused') { g.state = g.prev; lastTs = 0; } },
  quit() { g.state = 'menu'; g.items.length = 0; g.pops.length = 0; g.timeScale = 1; g.magnetT = 0; },
  setTheme: (name, instant) => scene.setTheme(name, instant),
  get state() { return g.state; },
  /** Live simulation state, exposed read-only for debugging (see `?debug` in main.js). */
  get debug() { return g; },
  get isRunning() { return g.state === 'ready' || g.state === 'playing' || g.state === 'dying'; },
};
