# Accessibility Statement

We want Our Cats to be playable by as many people as possible. This is a small hobby game,
so some barriers remain — here is an honest picture.

## Supported environments

Modern mobile and desktop browsers (Safari on iOS 15+, Chrome, Edge, Firefox). It works best
on a phone held in portrait.

## What we do

- **Reduced motion:** with the system setting `prefers-reduced-motion`, animations are cut
  to near-instant and screen shake is reduced.
- **Sound & haptics:** all sound is optional (mute button, state is remembered); nothing is
  communicated by sound alone — hazards also have angry faces and a red landing shadow.
- **Not colour-only:** hazards are distinguished by shape and expression, and timers are bars.
- **Touch targets:** main buttons are 42–60 px tall and the game is one-handed; the small ⓘ
  and close buttons (28–38 px) are below the recommended 44 px and are a known gap.
- **Keyboard:** menus are reachable with Tab/Enter/Space, `←`/`→` (or A/D) move the cat, `Esc` pauses.
- **Readable text:** high-contrast ink-on-paper UI, light and dark ("night") themes, Thai and English labels.
- **Pausing:** the game pauses automatically when the tab loses focus.

## Known limitations

- The playfield is a `<canvas>`, so screen readers can't follow the action. Menus and results
  use real buttons and labels, but live gameplay is visual and timing-based.
- There is no difficulty setting or slow-mode yet.
- There is no dedicated colour-blind palette (shape cues are used instead).
- Fast, flashing effects (e.g. FEVER mode) may be uncomfortable for some players. Enabling
  reduced motion in your OS lowers them but doesn't remove them entirely.

## Feedback

If something is a barrier for you, please
[open an issue](https://github.com/patapee-siri/cat-treat-catch/issues/new?template=accessibility.md)
or contact [@patapee-siri](https://github.com/patapee-siri). Describe the device, browser and
what you couldn't do; we'll do our best to fix it.
