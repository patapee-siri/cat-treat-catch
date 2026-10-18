/** Tiny typed wrapper around localStorage (never throws, e.g. private mode). */

const NS = 'cat-treat-catch:v2:';

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(NS + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(NS + key, JSON.stringify(value));
  } catch {
    /* storage unavailable — progress just won't persist */
  }
}

/** One-time import of the keys used by the first (single-file) release. */
function migrateLegacy() {
  if (read('migrated', false)) return;
  try {
    const muted = localStorage.getItem('catGameMuted');
    if (muted !== null) write('muted', muted === '1');
    const theme = localStorage.getItem('catGameTheme');
    if (theme === 'day' || theme === 'night') write('theme', theme);
    if (localStorage.getItem('catGameHintShown') === '1') write('hintShown', true);
    const top5 = localStorage.getItem('catGameTop5');
    if (top5) write('top5', JSON.parse(top5));
  } catch {
    /* ignore corrupt legacy data */
  }
  write('migrated', true);
}

export const store = {
  init: migrateLegacy,

  get muted() { return read('muted', false); },
  set muted(v) { write('muted', !!v); },

  /** 'auto' follows the device clock until the player picks a theme. */
  get theme() { return read('theme', 'auto'); },
  set theme(v) { write('theme', v); },

  get cat() { return read('cat', 0); },
  set cat(v) { write('cat', v); },

  get hintShown() { return read('hintShown', false); },
  set hintShown(v) { write('hintShown', !!v); },

  get top5() { return read('top5', []); },

  get best() {
    const list = read('top5', []);
    return list.length ? list[0].score : 0;
  },

  /** Records a finished run; returns the updated list and whether it beat the old best. */
  addScore(score) {
    const prevBest = this.best;
    const d = new Date();
    const date = `${d.getDate()}/${d.getMonth() + 1}/${String(d.getFullYear()).slice(2)}`;
    const list = [...read('top5', []), { score, date }]
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
    write('top5', list);
    return { list, isNewBest: score > prevBest };
  },
};
