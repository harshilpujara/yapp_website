# yapp website

Landing page for [yapp](https://github.com/harshilpujara/yapp): free, open-source voice-to-text for Windows.

Static HTML + CSS + vanilla JS. No framework, no build step.

```
index.html      page markup (inline SVG sprite: traced yapp mark + wordmark, icons)
styles.css      all styles; tokens live in :root
main.js         orb renderer, demo sequencer, mascot, scroll/hover micro-interactions
vendor/         thinking-orbs engine (MIT), the same one the app's recording pill uses
assets/         favicon, touch icon, social preview image
```

## Run locally

Any static server works, for example:

```
npx serve .
```

Opening `index.html` straight from disk won't work in every browser because `main.js` is an ES module.

## What moves

- **Hero orb**: the app's thinking-orbs engine painted in yapp's purple → pink, cycling through the
  pill's states. It follows the cursor a little and "listens harder" when you hover a CTA.
- **Demo**: Ctrl+Space → the recording pill slides up → raw speech with fillers → fillers get struck →
  clean text types in at the cursor. Loops through four scenes (email, Slack with "new line",
  Spanish without translation, a "sign off" voice shortcut). Pauses when off screen.
- **Footer mascot**: the yapp face, traced to SVG, turns its eyes toward your cursor, blinks, and
  says something when you poke it.
- Count-up stats, staggered blur-in reveals, scroll-spy nav dots, magnetic buttons, card spotlights.

Everything respects `prefers-reduced-motion`.

## Links to keep current

Download buttons point at `https://github.com/harshilpujara/yapp/releases/latest`.
