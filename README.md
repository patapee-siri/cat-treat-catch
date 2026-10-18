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

Drag (or move the mouse / use ← →) to move the cat. Catch smiling items, dodge scowling ones.
Catch quickly in a row to build a combo; the 🧲 power-up pulls treats toward the cat for a few seconds.
`Esc` pauses.

## Credits

Fonts: [Lilita One](https://fonts.google.com/specimen/Lilita+One) and [Mali](https://fonts.google.com/specimen/Mali),
licensed under the SIL Open Font License 1.1.
