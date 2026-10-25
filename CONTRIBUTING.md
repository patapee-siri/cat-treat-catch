# Contributing

Thanks for wanting to help! Bug reports, ideas, and small fixes are all welcome.

## Quick start

```bash
git clone https://github.com/patapee-siri/cat-treat-catch.git
cd cat-treat-catch
python -m http.server 8000      # ES modules need HTTP, not file://
```

Open <http://localhost:8000>. There is no build step and no dependencies.
Add `?debug` to the URL to expose `window.__game` for inspecting live state.

## Before you open a pull request

1. Open an issue first for anything bigger than a small fix, so we can agree on the approach.
2. Keep the visual language in [`docs/ART_BIBLE.md`](docs/ART_BIBLE.md) (outlined, flat, hard shadows).
3. Test on a phone-sized viewport. The game is mobile-first and must stay playable one-handed.
4. Respect `prefers-reduced-motion` for any new animation.
5. Keep the module boundaries: `engine.js` doesn't touch the DOM, `ui.js` talks to it through events.

## Style

- Plain modern JavaScript (ES modules), 2-space indent, single quotes.
- Tunable numbers go in `js/config.js`, colours and spacing in `css/tokens.css`.
- New art: SVG with the 4px ink stroke, `viewBox="0 0 100 100"` and explicit `width`/`height`.

## Licence

By contributing you agree your code is released under the [MIT licence](LICENSE).
Please don't submit personal photos you don't have the right to share.
