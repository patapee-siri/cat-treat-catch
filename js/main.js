/** Entry point: preload assets, then wire game + UI together. */
import { CATS, ITEM_DEFS } from './config.js';
import { preload } from './art.js';
import { store } from './storage.js';
import { game } from './engine.js';
import { initUI, gameEvents } from './ui.js';

async function loadFonts() {
  if (!document.fonts?.load) return;
  await Promise.allSettled([
    document.fonts.load('400 40px "Lilita One"', 'OUR CATS 123'),
    document.fonts.load('700 18px "Mali"', 'เริ่มเลย'),
    document.fonts.load('600 14px "Mali"', 'ครุกแชงค์ส'),
  ]);
}

async function boot() {
  store.init();

  const images = {};
  for (const c of CATS) images[`cat:${c.id}`] = c.img;
  for (const [key, def] of Object.entries(ITEM_DEFS)) images[`item:${key}`] = def.src;

  await Promise.all([preload(images), loadFonts()]);

  initUI();
  game.init(document.getElementById('scene'), gameEvents);
  if (new URLSearchParams(location.search).has('debug')) window.__game = game;

  const boot = document.getElementById('boot');
  boot.classList.add('done');
  setTimeout(() => boot.remove(), 600);
}

boot().catch((err) => {
  console.error(err);
  const p = document.querySelector('#boot p');
  if (p) p.textContent = 'โหลดไม่สำเร็จ ลองรีเฟรชอีกครั้งนะ';
});
