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

- **Hero**: what you said (fillers and all) drifts along a curve into the yapp pill, and the cleaned-up
  version comes out the other side on a dark ribbon. Scrolling speeds it up.
- **Speed**: typing at ~40 wpm next to talking at ~150 wpm, each line moving at its real pace. The
  talking lane widens as you scroll.
- **How it works**: a pinned section driven by scroll position. Ctrl+Space gets pressed, the pill
  slides up, words arrive, fillers and corrections get flagged, and the clean message types itself
  into a DM. Scrolling back rewinds it.
- **Features**: a sticky photo card that switches with the item you're reading (stacked on mobile).
- Privacy, pricing/setup steps, FAQ, and a closing CTA where the yapp face follows your cursor.

Everything respects `prefers-reduced-motion`.

## Photos

From Unsplash (free license), resized to WebP in `assets/photos/`:

| File | Source |
| --- | --- |
| talking-window.webp | https://unsplash.com/photos/woman-wearing-headphones-talks-at-laptop-by-window-j0dCClyasFk |
| typing-office.webp | https://unsplash.com/photos/a-woman-sitting-at-a-desk-with-a-laptop-and-headphones-xuevkdoZmfc |
| talking-colour.webp | https://unsplash.com/photos/woman-wearing-headphones-works-on-a-laptop-at-a-desk-_vXm9efLaXc |
| typing-window.webp | https://unsplash.com/photos/a-man-working-on-a-laptop-os7rk_Lh-XY |
| desk-monitor.webp | https://unsplash.com/photos/a-woman-sitting-at-a-desk-with-a-laptop-and-microphone-kMw7VdjCzC8 |
| cafe-window.webp | https://unsplash.com/photos/man-wearing-glasses-with-laptop-in-cafe-window-ko8KbYJYpgo |

Download links point at `https://github.com/harshilpujara/yapp/releases/latest`.
