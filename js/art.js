/** Image registry and small canvas drawing helpers shared by scene + game. */
import { INK } from './config.js';

const images = new Map();

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.decoding = 'async';
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error(`Failed to load ${src}`));
    im.src = src;
  });
}

/** Loads { key: src } pairs in parallel and registers them. */
export async function preload(map) {
  const entries = await Promise.all(
    Object.entries(map).map(async ([key, src]) => [key, await loadImage(src)]),
  );
  for (const [key, im] of entries) images.set(key, im);
}

export const img = (key) => images.get(key);

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a, b) => a + Math.random() * (b - a);

export const ease = {
  outCubic: (t) => 1 - (1 - t) ** 3,
  outBack: (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
  },
};

/** Adds an n-pointed star to the current path. */
export function starPath(ctx, cx, cy, r, rot = 0, points = 4, inner = 0.42) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = rot + (Math.PI * i) / points - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * inner;
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

export function heartPath(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.9);
  ctx.bezierCurveTo(cx - s * 1.5, cy - s * 0.1, cx - s * 0.7, cy - s * 1.1, cx, cy - s * 0.35);
  ctx.bezierCurveTo(cx + s * 0.7, cy - s * 1.1, cx + s * 1.5, cy - s * 0.1, cx, cy + s * 0.9);
  ctx.closePath();
}

/** Sticker lettering: ink stroke first, fill on top, optional hard drop. */
export function outlinedText(ctx, text, x, y, { font, fill = '#fff', stroke = INK, lw = 7, drop = 3 } = {}) {
  ctx.save();
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = lw;
  ctx.strokeStyle = stroke;
  if (drop) ctx.strokeText(text, x, y + drop);
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
  ctx.restore();
}
