# Our Cats — Cat Treat Catch

A small mobile-first browser game: catch treats for three real cats (Crookshanks, Ginny, Lumos),
dodge the cucumbers and bombs. Plain HTML/CSS/JavaScript — no build step, no dependencies.

**Play:** https://patapee-siri.github.io/cat-treat-catch/

## Run locally

The game uses ES modules, so it must be served over HTTP (opening `index.html` from disk won't work):

```bash
python -m http.server 8000
# then open http://localhost:8000
```

## Project layout

```
index.html            markup only
css/
  tokens.css          design tokens (colour, type, motion), day/night themes
  base.css            reset, shared keyframes
  components.css      panel, buttons, pills, HUD, modal, toast
  screens.css         cover, cat select, game over, trivia, leaderboard
js/
  main.js             entry: preload assets, wire game + UI
  config.js           cats, item definitions, tuning, palettes
  engine.js           simulation + canvas rendering (no DOM besides the canvas)
  scene.js            animated backdrop (sky, sun/moon, hills, meadow)
  ui.js               screens, HUD, modals, transitions, result animation
  audio.js            synthesised SFX + haptics (no audio files)
  storage.js          localStorage wrapper (scores, settings)
  art.js              image loader + canvas helpers
img/
  cats/               sticker PNGs (generated)
  items/              item SVGs (hand-authored)
  ui/                 icon sprite, cake, paw
fonts/                Lilita One + Mali (SIL OFL), self-hosted woff2
docs/ART_BIBLE.md     visual identity and asset standards
tools/make_stickers.py  turns transparent cat cut-outs into die-cut stickers (needs Pillow)
```

## Controls

Drag (or move the mouse / use ← →) to move the cat. Catch smiling items, dodge scowling ones. `Esc` pauses.

**Combo system**
- Every catch extends your streak; the streak only breaks when a treat hits the ground (touching a hazard ends the run).
- Score multiplier steps up at streaks of 5 / 10 / 20 (x2 / x3 / x4).
- Reaching a streak of 10 triggers **FEVER** for ~6 s: double points, hazards turn into golden cookies, treats rain faster.
  A streak can't break during FEVER, and it can retrigger every 15 more catches.
- Treats sometimes fall as trails (diagonal, zigzag, wave, column) you can sweep through in one motion.
- The 🧲 power-up pulls treats toward the cat for a few seconds.

Open the site with `?debug` to expose `window.__game` for inspecting live state.

## Credits

Fonts: [Lilita One](https://fonts.google.com/specimen/Lilita+One) and [Mali](https://fonts.google.com/specimen/Mali),
licensed under the SIL Open Font License 1.1.
