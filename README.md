# yapp website

Landing page for [yapp](https://github.com/harshilpujara/yapp): free, open-source voice to text for Windows.

Static HTML, CSS and vanilla JS. No framework, no build step.

```
index.html      markup, plus an inline SVG sprite (traced yapp mark and wordmark)
styles.css      all styles; colours and fonts are tokens in :root
main.js         scroll-driven sections, the word stream, pill orbs, mascot
vendor/         thinking-orbs engine (MIT), the same one the app's recording pill uses
assets/         favicon, touch icon, social image, photos/
```

## Run locally

```
npx serve .
```

`main.js` is an ES module, so open the page through a server rather than from disk.

## Sections

- **Hero**: sized to the screen so the animation is always in view. What you said (fillers and all) drifts along a curve into the yapp pill, and the cleaned-up
  version comes out the other side on a dark ribbon. Scrolling speeds it up.
- **Launch video**: `assets/video/` (MP4 with a WebM fallback, poster frame). Grows into place on
  scroll, autoplays muted while on screen, pauses when off screen; play/pause and sound buttons.
- **Speed**: typing at ~40 wpm next to talking at ~150 wpm, each line moving at its real pace. The two
  panels trade space with scroll position (widths on desktop, heights on mobile), both directions.
- **How it works**: a pinned section driven by scroll position. Ctrl+Space gets pressed, the pill
  slides up, words arrive, fillers and corrections get flagged, and the clean message types itself
  into a DM. Scrolling back rewinds it.
- **Features**: a sticky photo card that switches with the item you're reading (stacked on mobile).
- Privacy, pricing/setup steps, FAQ, and a closing CTA where the yapp face follows your cursor.

Everything respects `prefers-reduced-motion`.

## Photos

From Unsplash (free license), resized to WebP in `assets/photos/`:

| File | Unsplash image |
| --- | --- |
| talking-window.webp | https://images.unsplash.com/photo-1759984782076-2909625b0aa8 |
| typing-office.webp | https://images.unsplash.com/photo-1759984782092-cee3967a0a31 |
| talking-colour.webp | https://images.unsplash.com/photo-1758874384552-5d090a98033b |
| typing-window.webp | https://images.unsplash.com/photo-1663743555914-4c948542f757 |
| desk-monitor.webp | https://images.unsplash.com/photo-1712904124115-92f9bf39072d |
| cafe-window.webp | https://images.unsplash.com/photo-1764688307432-2b11e191b2f3 |

Download links point at `https://github.com/harshilpujara/yapp/releases/latest`.
