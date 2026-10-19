/** Animated backdrop: sky, sun/moon, clouds, parallax hills, stitched meadow, ambient particles.
    Runs behind every screen (menus included) and cross-fades between day and night. */
import { PALETTES } from './config.js';
import { rand, lerp, clamp, starPath } from './art.js';

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const PAL = Object.fromEntries(
  Object.entries(PALETTES).map(([name, p]) => [name, Object.fromEntries(Object.entries(p).map(([k, v]) => [k, hex(v)]))]),
);

function mix(key, k, alpha = 1) {
  const a = PAL.day[key];
  const b = PAL.night[key];
  const c = [0, 1, 2].map((i) => Math.round(lerp(a[i], b[i], k)));
  return alpha >= 1 ? `rgb(${c[0]},${c[1]},${c[2]})` : `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;
}

const FLOWER_COLORS = ['#ffffff', '#ffd36e', '#ff6b8b', '#b9a3f5'];

export const scene = {
  W: 0, H: 0, groundTopY: 0, groundH: 0,
  night: 0, nightTarget: 0,
  parallax: 0, parallaxTarget: 0,
  fever: 0, feverTarget: 0,
  time: 0,
  clouds: [], stars: [], petals: [], flies: [], flowers: [], tufts: [], hillFar: [], hillNear: [],

  setFever(on) {
    this.feverTarget = on ? 1 : 0;
    if (!on && this.fever < 0.01) this.fever = 0;
  },

  setTheme(name, instant = false) {
    this.nightTarget = name === 'night' ? 1 : 0;
    if (instant) this.night = this.nightTarget;
  },

  resize(W, H) {
    this.W = W;
    this.H = H;
    this.groundH = clamp(H * 0.17, 80, 140);
    this.groundTopY = H - this.groundH;

    this.hillFar = [];
    this.hillNear = [];
    const steps = 22;
    for (let i = 0; i <= steps; i++) {
      const x = -80 + ((W + 160) * i) / steps;
      const u = i / steps;
      this.hillFar.push({ x, y: this.groundTopY - H * 0.055 - Math.sin(u * Math.PI * 2.4 + 0.6) * H * 0.022 });
      this.hillNear.push({ x, y: this.groundTopY - H * 0.012 - Math.sin(u * Math.PI * 2.0 + 2.1) * H * 0.03 });
    }

    this.flowers = Array.from({ length: Math.floor(W / 34) }, () => ({
      x: rand(10, W - 10),
      y: this.groundTopY + this.groundH * rand(0.4, 0.88),
      r: rand(3, 5),
      color: FLOWER_COLORS[Math.floor(Math.random() * FLOWER_COLORS.length)],
      phase: rand(0, 6.28),
    }));
    this.tufts = Array.from({ length: Math.floor(W / 24) }, () => ({
      x: rand(0, W),
      y: this.groundTopY + this.groundH * rand(0.2, 0.55),
      h: rand(8, 14),
      phase: rand(0, 6.28),
    }));
    this.stars = Array.from({ length: Math.floor(W / 16) }, (_, i) => ({
      x: rand(0, W),
      y: rand(0, this.groundTopY * 0.8),
      r: rand(0.8, 2),
      phase: rand(0, 6.28),
      big: i % 6 === 0,
    }));
    this.clouds = Array.from({ length: 3 }, (_, i) => ({
      x: (i + 0.3) * (W / 3) + rand(-30, 30),
      y: rand(40, H * 0.2),
      s: rand(26, 42),
      speed: rand(7, 14),
    }));
    this.petals = Array.from({ length: 9 }, () => ({
      x: rand(0, W), y: rand(0, H * 0.75), vx: rand(10, 22), vy: rand(18, 34),
      rot: rand(0, 6.28), vr: rand(-2, 2), s: rand(3, 5.5),
    }));
    this.flies = Array.from({ length: 10 }, () => ({
      x: rand(0, W), y: rand(H * 0.25, this.groundTopY), phase: rand(0, 6.28), r: rand(2, 3.2), sp: rand(8, 20),
    }));
  },

  update(dt) {
    this.time += dt;
    const d = this.nightTarget - this.night;
    this.night = Math.abs(d) < 0.001 ? this.nightTarget : this.night + Math.sign(d) * Math.min(Math.abs(d), dt / 0.9);
    this.parallax += (this.parallaxTarget - this.parallax) * Math.min(1, dt * 3);
    this.fever += (this.feverTarget - this.fever) * Math.min(1, dt * 4);

    for (const c of this.clouds) {
      c.x += c.speed * dt;
      if (c.x - c.s * 2 > this.W) c.x = -c.s * 3;
    }
    for (const p of this.petals) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      if (p.y > this.groundTopY + 10 || p.x > this.W + 10) { p.x = rand(-40, this.W * 0.6); p.y = -10; }
    }
    for (const f of this.flies) {
      f.x += Math.sin(this.time * 0.7 + f.phase) * f.sp * dt;
      f.y += Math.cos(this.time * 0.9 + f.phase) * f.sp * 0.6 * dt;
      f.x = (f.x + this.W) % this.W;
    }
  },

  draw(ctx) {
    const { W, H, groundTopY, groundH, night: n, time: t } = this;
    const day = 1 - n;

    // Sky
    const sky = ctx.createLinearGradient(0, 0, 0, groundTopY + 20);
    sky.addColorStop(0, mix('skyTop', n));
    sky.addColorStop(1, mix('skyBottom', n));
    ctx.fillStyle = sky;
    ctx.fillRect(-24, -24, W + 48, H + 48);

    // FEVER: a colour-cycling party wash with a beat pulse
    if (this.fever > 0.01) {
      const f = this.fever;
      const hue = (t * 70) % 360;
      const wash = ctx.createLinearGradient(0, 0, W, groundTopY);
      wash.addColorStop(0, `hsla(${hue},95%,68%,${(0.42 * f).toFixed(3)})`);
      wash.addColorStop(1, `hsla(${(hue + 90) % 360},95%,70%,${(0.42 * f).toFixed(3)})`);
      ctx.fillStyle = wash;
      ctx.fillRect(-24, -24, W + 48, H + 48);
      const beat = Math.max(0, Math.sin(t * 10));
      ctx.fillStyle = `rgba(255,255,255,${(0.1 * f * beat).toFixed(3)})`;
      ctx.fillRect(-24, -24, W + 48, H + 48);
    }

    const sx = W * 0.8;
    const baseY = H * 0.13 + Math.sin(t * 0.8) * 5;
    const R = clamp(W * 0.11, 30, 52);

    // Sun rays (day only)
    if (day > 0.02) {
      ctx.save();
      ctx.translate(sx, baseY + n * H * 0.2);
      ctx.rotate(t * 0.05);
      ctx.fillStyle = `rgba(255,240,190,${(0.13 * day).toFixed(3)})`;
      for (let i = 0; i < 7; i++) {
        const a = (i * Math.PI * 2) / 7;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a - 0.09) * H, Math.sin(a - 0.09) * H);
        ctx.lineTo(Math.cos(a + 0.09) * H, Math.sin(a + 0.09) * H);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    // Stars (night only)
    if (n > 0.02) {
      ctx.fillStyle = '#fff';
      for (const s of this.stars) {
        const a = n * (0.3 + 0.7 * Math.abs(Math.sin(t * 1.4 + s.phase)));
        ctx.globalAlpha = a;
        if (s.big) { starPath(ctx, s.x, s.y, s.r * 3.2, t * 0.3 + s.phase); ctx.fill(); }
        else { ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill(); }
      }
      ctx.globalAlpha = 1;
    }

    // Sun and moon swap places by sliding below the horizon
    this.drawSun(ctx, sx, baseY + n * H * 0.2, R, day, t);
    this.drawMoon(ctx, sx, baseY + day * H * 0.2, R, n);

    // Clouds
    for (const c of this.clouds) this.drawCloud(ctx, c.x, c.y, c.s, n);

    // Hills with parallax
    ctx.fillStyle = mix('hillFar', n);
    this.fillHill(ctx, this.hillFar, this.parallax * -12);
    ctx.fillStyle = mix('hillNear', n);
    this.fillHill(ctx, this.hillNear, this.parallax * -26);

    // Meadow
    const g = ctx.createLinearGradient(0, groundTopY, 0, H);
    g.addColorStop(0, mix('groundTop', n));
    g.addColorStop(1, mix('groundBottom', n));
    ctx.fillStyle = g;
    ctx.fillRect(-24, groundTopY, W + 48, groundH + 24);
    ctx.fillStyle = mix('groundLine', n, 0.9);
    ctx.fillRect(-24, groundTopY - 1.5, W + 48, 4);
    ctx.setLineDash([9, 9]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = mix('groundLine', n, 0.5);
    ctx.beginPath();
    ctx.moveTo(-24, groundTopY + 13);
    ctx.lineTo(W + 24, groundTopY + 13);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.lineCap = 'round';
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = mix('groundLine', n, 0.55);
    for (const f of this.tufts) {
      const sway = Math.sin(t * 1.6 + f.phase) * 3;
      for (let b = -1; b <= 1; b++) {
        ctx.beginPath();
        ctx.moveTo(f.x + b * 4, f.y);
        ctx.quadraticCurveTo(f.x + b * 5, f.y - f.h * 0.6, f.x + b * 7 + sway, f.y - f.h);
        ctx.stroke();
      }
    }
    for (const f of this.flowers) this.drawFlower(ctx, f, t);

    // Ambient: petals by day, fireflies by night
    if (day > 0.05) {
      ctx.fillStyle = `rgba(255,255,255,${(0.85 * day).toFixed(2)})`;
      for (const p of this.petals) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.beginPath();
        ctx.ellipse(0, 0, p.s, p.s * 0.55, 0, 0, 6.283);
        ctx.fill();
        ctx.restore();
      }
    }
    if (n > 0.05) {
      for (const f of this.flies) {
        const pulse = 0.5 + 0.5 * Math.sin(t * 2.2 + f.phase);
        ctx.fillStyle = `rgba(255,211,110,${(0.25 * n * pulse).toFixed(3)})`;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 3.4, 0, 6.283); ctx.fill();
        ctx.fillStyle = `rgba(255,236,160,${(0.95 * n * pulse).toFixed(3)})`;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.283); ctx.fill();
      }
    }
  },

  fillHill(ctx, pts, shift) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x + shift, this.groundTopY + 40);
    for (const p of pts) ctx.lineTo(p.x + shift, p.y);
    ctx.lineTo(pts[pts.length - 1].x + shift, this.groundTopY + 40);
    ctx.closePath();
    ctx.fill();
  },

  drawCloud(ctx, x, y, r, n) {
    const lobes = [
      [-r * 0.9, r * 0.15, r * 0.55],
      [-r * 0.25, -r * 0.25, r * 0.72],
      [r * 0.45, -r * 0.05, r * 0.6],
      [r * 0.95, r * 0.18, r * 0.45],
    ];
    const path = (dy) => {
      ctx.beginPath();
      for (const [dx, ly, rr] of lobes) { ctx.moveTo(x + dx + rr, y + ly + dy); ctx.arc(x + dx, y + ly + dy, rr, 0, 6.283); }
    };
    ctx.fillStyle = mix('cloudShade', n);
    path(r * 0.14); ctx.fill();
    ctx.fillStyle = mix('cloud', n);
    path(0); ctx.fill();
  },

  drawSun(ctx, x, y, R, a, t) {
    if (a < 0.02) return;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(x, y);
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 3);
    glow.addColorStop(0, 'rgba(255,241,194,0.65)');
    glow.addColorStop(1, 'rgba(255,241,194,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(-R * 3, -R * 3, R * 6, R * 6);
    ctx.save();
    ctx.rotate(t * 0.12);
    ctx.fillStyle = '#ffc94a';
    for (let i = 0; i < 8; i++) {
      const ang = (i * Math.PI) / 4;
      ctx.beginPath();
      ctx.ellipse(Math.cos(ang) * R * 1.36, Math.sin(ang) * R * 1.36, R * 0.3, R * 0.12, ang, 0, 6.283);
      ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = '#ffd36e';
    ctx.beginPath(); ctx.arc(0, 0, R, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#ff9db5';
    ctx.globalAlpha = a * 0.7;
    ctx.beginPath(); ctx.arc(-R * 0.55, R * 0.22, R * 0.15, 0, 6.283); ctx.fill();
    ctx.beginPath(); ctx.arc(R * 0.55, R * 0.22, R * 0.15, 0, 6.283); ctx.fill();
    ctx.globalAlpha = a;
    ctx.fillStyle = '#4a2c3a';
    ctx.beginPath(); ctx.arc(-R * 0.3, -R * 0.06, R * 0.09, 0, 6.283); ctx.fill();
    ctx.beginPath(); ctx.arc(R * 0.3, -R * 0.06, R * 0.09, 0, 6.283); ctx.fill();
    ctx.strokeStyle = '#4a2c3a';
    ctx.lineWidth = R * 0.07;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, R * 0.04, R * 0.3, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    ctx.restore();
  },

  drawMoon(ctx, x, y, R, a) {
    if (a < 0.02) return;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(x, y);
    const glow = ctx.createRadialGradient(0, 0, R * 0.5, 0, 0, R * 3);
    glow.addColorStop(0, 'rgba(200,190,255,0.5)');
    glow.addColorStop(1, 'rgba(200,190,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(-R * 3, -R * 3, R * 6, R * 6);
    ctx.fillStyle = '#fff4e3';
    ctx.beginPath(); ctx.arc(0, 0, R, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#eadfca';
    ctx.beginPath(); ctx.arc(R * 0.45, -R * 0.4, R * 0.2, 0, 6.283); ctx.fill();
    ctx.beginPath(); ctx.arc(-R * 0.5, R * 0.5, R * 0.14, 0, 6.283); ctx.fill();
    ctx.beginPath(); ctx.arc(R * 0.55, R * 0.45, R * 0.1, 0, 6.283); ctx.fill();
    ctx.strokeStyle = '#4a2c3a';
    ctx.lineWidth = R * 0.07;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(-R * 0.3, -R * 0.02, R * 0.12, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.arc(R * 0.3, -R * 0.02, R * 0.12, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, R * 0.2, R * 0.12, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
    ctx.restore();
  },

  drawFlower(ctx, f, t) {
    const sway = Math.sin(t * 1.3 + f.phase) * 1.2;
    ctx.fillStyle = f.color;
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5 + t * 0.15;
      ctx.beginPath();
      ctx.arc(f.x + sway + Math.cos(a) * f.r * 0.95, f.y + Math.sin(a) * f.r * 0.95, f.r * 0.62, 0, 6.283);
      ctx.fill();
    }
    ctx.fillStyle = '#ffd36e';
    ctx.beginPath(); ctx.arc(f.x + sway, f.y, f.r * 0.55, 0, 6.283); ctx.fill();
  },
};
