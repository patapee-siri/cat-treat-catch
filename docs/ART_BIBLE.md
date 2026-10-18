# Art Bible — Our Cats

Short reference so every new asset or screen stays in one visual language.
Structure follows the art-bible template from
[Claude Code Game Studios](https://github.com/Donchitos/Claude-Code-Game-Studios).

## 1. Visual identity

> **Everything is a die-cut sticker: thick dark outline, flat colour, hard shadow. Never glossy.**

| Principle | Design test ("when unsure, choose…") |
|---|---|
| Outline everything in the foreground | Foreground (cat, items, UI) gets the `--ink` outline; backdrop stays soft and outline-free. |
| Shadows are hard offsets, not blurs | `0 5px 0 var(--line)` beats any `blur()`; the only blurred shadow is the page-level drop under a panel. |
| Faces carry meaning | Smiling item = catch it. Scowling item = dodge it. No item is ambiguous. |

## 2. Mood per state

| State | Feel | Light |
|---|---|---|
| Cover / menus | Warm, welcoming, a little showy | Pink morning, sun rays, drifting petals |
| Playing (day) | Bright and bouncy | Same scene, higher contrast items |
| Playing (night) | Cosy and calm | Indigo sky, sleepy moon, fireflies |
| Hit / game over | Brief shock, then comfort | Red flash + slow-mo, then back to paper-white panel |

## 3. Shape language

Rounded, chunky, thumb-sized. Hero shapes (cats) are the largest and brightest; supporting
shapes (items) are ~½ cat size; danger items add angular cues (angry brows, jagged mouth, spark).

## 4. Colour system

| Token | Hex | Meaning |
|---|---|---|
| `--ink` | `#4a2c3a` | Outlines, text on light surfaces |
| `--pink` | `#ff6b8b` | Primary action, score, brand |
| `--butter` | `#ffd36e` | Reward, highlight, combo |
| `--mint` | `#8fd8b5` | Positive / timers |
| `--danger` | `#ff5a6e` | Hazards, magnet power-up, errors |
| `--cream` / `--paper` | `#fff4e3` / `#fffaf0` | Surfaces |

Colour is never the only signal: hazards also have angry faces and a red ground shadow;
the combo timer is a bar, not just a colour.

## 5. Character direction

The three cats are real photographs, cut out and turned into stickers (white border + thin ink
contour) by `tools/make_stickers.py`. They are the only photographic elements; everything else is flat vector.

## 6. Environment

Layered backdrop (sky → sun/moon → clouds → two parallax hills → stitched meadow). The dashed
"stitch" line in the grass echoes the stitched edge on UI panels.

## 7. UI / HUD

- **Type:** Lilita One for display numerals/logo, Mali (Thai + Latin) for body copy.
- **Components:** panel (paper + dashed stitching), ribbon label, chunky press-down button, round icon button, pill HUD.
- **Motion:** pop-ins use an overshoot ease (`--ease-pop`); presses sink 4px; screen changes use a paw-print iris wipe;
  numbers bump on change; combo and result screens use stamp animations. All motion respects `prefers-reduced-motion`.
- **Game feel:** squash & stretch on a damped spring, hop on catch, pentatonic catch pitch that climbs with the combo,
  hit-stop + slow-mo + screen shake on a hit, landing shadows that telegraph where items fall.

## 8. Asset standards

| Asset | Format | Notes |
|---|---|---|
| Items | SVG, `viewBox 0 0 100 100`, explicit `width/height` | 4px ink stroke, round joins, flat fills, one white highlight |
| Cats | PNG ~320px square | Generated, do not hand-edit — re-run the tool |
| Icons | one SVG sprite (`img/ui/icons.svg`) | `currentColor`, referenced with `<use>` |
| Fonts | woff2, self-hosted | Latin + Thai subsets only |

## 9. References (what to take, what to avoid)

- *Cut the Rope / Crossy Road* — thick outlines and readable silhouettes; avoid copying their palettes.
- *Neko Atsume* — cosy, low-pressure tone; avoid its washed-out pastel flatness.
- Sticker-sheet art — die-cut border treatment; avoid heavy drop shadows.
