/** Synthesised sound effects (Web Audio) + haptics. No audio files to ship. */

let ctx = null;
let master = null;
let muted = false;

export function unlock() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
  } catch {
    /* audio unavailable */
  }
}

export const setMuted = (m) => { muted = !!m; };
export const isMuted = () => muted;

export function haptic(pattern) {
  try { navigator.vibrate?.(pattern); } catch { /* unsupported */ }
}

function tone({ f, f2 = null, d = 0.12, type = 'sine', g = 0.18, at = 0, attack = 0.008 }) {
  if (!ctx || muted) return;
  const t = ctx.currentTime + at;
  const o = ctx.createOscillator();
  const v = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(f2, 1), t + d);
  v.gain.setValueAtTime(0.0001, t);
  v.gain.exponentialRampToValueAtTime(g, t + attack);
  v.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(v).connect(master);
  o.start(t);
  o.stop(t + d + 0.03);
}

function noise({ d = 0.25, g = 0.25, from = 1800, to = 200, at = 0 }) {
  if (!ctx || muted) return;
  const t = ctx.currentTime + at;
  const len = Math.floor(ctx.sampleRate * d);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(from, t);
  filter.frequency.exponentialRampToValueAtTime(to, t + d);
  const v = ctx.createGain();
  v.gain.setValueAtTime(g, t);
  v.gain.exponentialRampToValueAtTime(0.0001, t + d);
  src.connect(filter).connect(v).connect(master);
  src.start(t);
}

const midi = (m) => 440 * 2 ** ((m - 69) / 12);
const PENTATONIC = [0, 2, 4, 7, 9];

export const sfx = {
  click() { tone({ f: 520, f2: 700, d: 0.06, type: 'triangle', g: 0.12 }); },

  tick() { tone({ f: 880, d: 0.04, type: 'square', g: 0.04 }); },

  /** Each consecutive catch climbs a pentatonic scale, so combos sound musical. */
  catch(combo = 1, fever = false) {
    const i = Math.max(0, combo - 1);
    const note = 72 + PENTATONIC[i % 5] + 12 * Math.min(Math.floor(i / 5), 2) + (fever ? 12 : 0);
    const f = midi(note);
    tone({ f, d: 0.16, g: 0.2 });
    tone({ f: f * 2, d: 0.1, type: 'triangle', g: 0.07, at: 0.02 });
    tone({ f: f * 3, d: 0.06, g: 0.03, at: 0.04 });
    if (fever) tone({ f: f * 1.5, d: 0.12, type: 'square', g: 0.04, at: 0.03 });
  },

  /** Streak broke: a short sagging blip. */
  miss() {
    tone({ f: 330, f2: 170, d: 0.22, type: 'triangle', g: 0.16 });
  },

  /** Multiplier went up: quick rising triad. */
  tier() {
    [0, 4, 7].forEach((s, i) => tone({ f: midi(79 + s), d: 0.12, type: 'triangle', g: 0.15, at: i * 0.05 }));
  },

  /** FEVER start: rising sweep + chord stab. */
  fever() {
    tone({ f: 200, f2: 1400, d: 0.45, type: 'sawtooth', g: 0.08 });
    [0, 4, 7, 12].forEach((s) => tone({ f: midi(72 + s), d: 0.5, type: 'square', g: 0.07, at: 0.3 }));
    tone({ f: midi(84), d: 0.6, type: 'triangle', g: 0.14, at: 0.3 });
  },

  bad() {
    noise({ d: 0.45, g: 0.35, from: 2400, to: 120 });
    tone({ f: 190, f2: 55, d: 0.4, type: 'sawtooth', g: 0.2 });
  },

  magnet() {
    [0, 4, 7, 12].forEach((s, i) => tone({ f: midi(67 + s), d: 0.14, type: 'triangle', g: 0.14, at: i * 0.06 }));
  },

  countdown(final = false) {
    tone({ f: final ? 880 : 520, d: final ? 0.32 : 0.12, type: 'triangle', g: final ? 0.2 : 0.16 });
  },

  stamp() {
    noise({ d: 0.12, g: 0.18, from: 900, to: 180 });
    tone({ f: 150, f2: 70, d: 0.14, type: 'sine', g: 0.22 });
  },

  fanfare() {
    [0, 4, 7, 12, 16].forEach((s, i) => tone({ f: midi(72 + s), d: 0.2, type: 'triangle', g: 0.16, at: i * 0.09 }));
    tone({ f: midi(84), d: 0.5, type: 'sine', g: 0.14, at: 0.5 });
  },

  /** Synth meow: a sawtooth through a sweeping band-pass, like a vowel glide. */
  meow(pitch = 1) {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const f = ctx.createBiquadFilter();
    const v = ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(430 * pitch, t);
    o.frequency.linearRampToValueAtTime(640 * pitch, t + 0.12);
    o.frequency.linearRampToValueAtTime(380 * pitch, t + 0.4);
    f.type = 'bandpass';
    f.Q.value = 3.2;
    f.frequency.setValueAtTime(900, t);
    f.frequency.linearRampToValueAtTime(1900, t + 0.16);
    f.frequency.linearRampToValueAtTime(800, t + 0.4);
    v.gain.setValueAtTime(0.0001, t);
    v.gain.exponentialRampToValueAtTime(0.2, t + 0.05);
    v.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
    o.connect(f).connect(v).connect(master);
    o.start(t);
    o.stop(t + 0.45);
  },
};
