// yapp website. Plain ES module, no build step.
// The pill orbs use the thinking-orbs engine the yapp app itself vendors for its
// recording pill, painted purple -> pink the same way the app's pill.js does.
import { MODE_FRAMES, resolvePreset } from "./vendor/thinking-orbs-engine.js";

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const mix = (a, b, f) => a + (b - a) * f;
const ease = (t) => 1 - Math.pow(1 - t, 3);
// progress of t through [a, b], clamped to 0..1
const span = (t, a, b) => clamp((t - a) / (b - a));

/* ------------------------------------------------------------------ *
 * One animation loop for everything that runs per frame
 * ------------------------------------------------------------------ */
const loops = new Set();
let last = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
  last = now;
  for (const fn of loops) fn(dt, now);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

const onVisible = (el, cb, opts) => {
  const io = new IntersectionObserver(([e]) => cb(e.isIntersecting), opts);
  io.observe(el);
};

/* ------------------------------------------------------------------ *
 * Orb (yapp's recording pill animation)
 * ------------------------------------------------------------------ */
const PURPLE = [124, 92, 255];
const PINK = [255, 110, 199];
const PRESET = 20;

class Orb {
  constructor(canvas, state = "listening") {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.t = Math.random() * 10;
    this.level = 0.3;
    this.target = 0.3;
    this.set(state);
  }
  set(state) {
    if (this.state === state) return;
    this.state = state;
    const p = resolvePreset(state, PRESET);
    this.mode = { frame: MODE_FRAMES[p.mode], opts: p.opts, speed: p.speed };
  }
  size() {
    const dpr = Math.min(2, devicePixelRatio || 1);
    const w = Math.round((this.canvas.clientWidth || 40) * dpr);
    if (this.canvas.width !== w) this.canvas.width = this.canvas.height = w;
  }
  step(dt) {
    this.level = mix(this.level, this.target, 0.15);
    this.t += dt * this.mode.speed * (0.6 + 1.6 * this.level);
    this.draw(0.9 + 0.18 * this.level);
  }
  draw(k = 1) {
    this.size();
    const { ctx, canvas } = this;
    const px = canvas.width / PRESET;
    const c = PRESET / 2;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(px * k, 0, 0, px * k, canvas.width / 2 - c * px * k, canvas.height / 2 - c * px * k);
    for (const d of this.mode.frame(PRESET, this.t, this.mode.opts).dots) {
      const near = 1 - clamp(d.white);
      const f = clamp(d.x / PRESET);
      const lift = 0.05 + 0.3 * near;
      const r = Math.round(mix(mix(PURPLE[0], PINK[0], f), 255, lift));
      const g = Math.round(mix(mix(PURPLE[1], PINK[1], f), 255, lift));
      const b = Math.round(mix(mix(PURPLE[2], PINK[2], f), 255, lift));
      ctx.fillStyle = `rgba(${r},${g},${b},${(d.a ?? 1) * (0.55 + 0.45 * near)})`;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// Every pill on the page gets an orb that only animates while it's on screen.
const orbs = new Map();
for (const canvas of $$(".yp-orb")) {
  const orb = new Orb(canvas);
  orbs.set(canvas, orb);
  // a soft fake "voice" so the orb breathes like someone is talking
  const run = (dt, now) => {
    if (!orb.hold) orb.target = 0.35 + 0.35 * Math.abs(Math.sin(now / 420) * Math.sin(now / 1130 + 2));
    orb.step(dt);
  };
  if (reduceMotion) orb.draw();
  else onVisible(canvas, (v) => (v ? loops.add(run) : loops.delete(run)));
}
const orbOf = (pill) => orbs.get($(".yp-orb", pill));

/* ------------------------------------------------------------------ *
 * Nav
 * ------------------------------------------------------------------ */
{
  const nav = $("#nav");
  const links = $$(".nav-links a");
  const targets = links.map((a) => $(a.getAttribute("href")));
  const update = () => {
    nav.classList.toggle("scrolled", scrollY > 12);
    const y = innerHeight * 0.35;
    links.forEach((a, i) => {
      const r = targets[i].getBoundingClientRect();
      a.classList.toggle("active", r.top <= y && r.bottom > y);
    });
  };
  addEventListener("scroll", update, { passive: true });
  update();

  const burger = $("#burger");
  const menu = $("#menu");
  const set = (open) => {
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    menu.hidden = !open;
  };
  burger.addEventListener("click", () => set(menu.hidden));
  $$("a", menu).forEach((a) => a.addEventListener("click", () => set(false)));
  addEventListener("keydown", (e) => e.key === "Escape" && set(false));
  addEventListener("resize", () => innerWidth > 860 && set(false), { passive: true });
}

/* ------------------------------------------------------------------ *
 * Reveal on scroll
 * ------------------------------------------------------------------ */
{
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
  }, { threshold: 0.15 });
  $$("[data-reveal]").forEach((el) => io.observe(el));
}

/* ------------------------------------------------------------------ *
 * Hero: what you said flows into the pill, what yapp wrote flows out
 * ------------------------------------------------------------------ */
{
  const svg = $("#stream-svg");
  const rawPath = $("#raw-path");
  const cleanPath = $("#clean-path");
  const pill = $("#hero-pill");
  const stream = $(".stream");
  const NS = "http://www.w3.org/2000/svg";

  const RAW = "so um I was thinking we could, uh, maybe move the the review to Thursday, no wait, Friday, and like loop in Dev on it too ";
  const FILLERS = new Set(["um", "uh,", "uh", "like", "the", "wait,", "no", "Thursday,"]);
  const CLEAN = "I was thinking we could move the review to Friday and loop in Dev on it too.   ·   ";

  // Fill a textPath with `copies` of the sentence; fillers get their own colour.
  const fillRaw = (copies) => {
    rawPath.textContent = "";
    for (let c = 0; c < copies; c++) {
      let prev = "";
      for (const word of RAW.trim().split(" ")) {
        const t = document.createElementNS(NS, "tspan");
        // only mark the second "the" of "the the" as a repeat
        const isFiller = word === "the" ? prev === "the" : FILLERS.has(word);
        if (isFiller) t.setAttribute("class", "f");
        t.textContent = word + " ";
        rawPath.append(t);
        prev = word;
      }
    }
  };
  fillRaw(1);
  const rawLen = rawPath.getComputedTextLength();
  const pathA = $("#sp-a");
  const pathB = $("#sp-b");
  const lenA = pathA.getTotalLength();
  const lenB = pathB.getTotalLength();
  fillRaw(Math.ceil(lenA / rawLen) + 2);
  cleanPath.textContent = CLEAN;
  const cleanLen = cleanPath.getComputedTextLength();
  cleanPath.textContent = CLEAN.repeat(Math.ceil(lenB / cleanLen) + 2);

  // Put the pill where the two paths meet, tilted to follow the curve.
  const placePill = () => {
    const m = svg.getScreenCTM();
    const box = stream.getBoundingClientRect();
    if (!m) return;
    const p = svg.createSVGPoint();
    p.x = 720; p.y = 150;
    const s = p.matrixTransform(m);
    pill.style.left = `${s.x - box.left}px`;
    pill.style.top = `${s.y - box.top}px`;
    pill.style.setProperty("--rot", `${(Math.atan2(90, 300) * 180) / Math.PI}deg`);
    pill.classList.add("ready");
  };
  placePill();
  addEventListener("resize", placePill, { passive: true });
  document.fonts?.ready.then(placePill);

  // Raw text ends where the pill starts; clean text starts where it ends.
  let x = 0;
  let boost = 0;
  let lastY = scrollY;
  const run = (dt) => {
    const dy = Math.abs(scrollY - lastY);
    lastY = scrollY;
    boost = mix(boost, Math.min(dy * 6, 400), 0.08);
    x += dt * (55 + boost);
    // raw text slides right and disappears into the pill at the end of path A
    rawPath.setAttribute("startOffset", ((x % rawLen) - rawLen).toFixed(1));
    // clean text comes out of the pill at the start of path B
    cleanPath.setAttribute("startOffset", ((x % cleanLen) - cleanLen).toFixed(1));
  };
  run(0);
  if (!reduceMotion) onVisible(stream, (v) => (v ? loops.add(run) : loops.delete(run)));
}

/* ------------------------------------------------------------------ *
 * Speed: typing vs talking lanes
 * ------------------------------------------------------------------ */
{
  const race = $("#race");
  const voice = $(".lane-voice", race);
  // duplicate each track so the loop is seamless, and pace them at 40 vs 150 wpm
  for (const track of $$(".lane-track", race)) {
    track.textContent = track.textContent.trim() + "   " ;
    track.textContent += track.textContent;
    const wps = track.classList.contains("fast") ? 150 / 60 : 40 / 60; // words per second
    const pxPerWord = 6.2 * parseFloat(getComputedStyle(track).fontSize);
    const half = track.scrollWidth / 2;
    track.style.animationDuration = `${half / (wps * pxPerWord * 0.42)}s`;
  }
  // count the wpm numbers up once
  onVisible(race, (v) => {
    if (!v || race.dataset.counted) return;
    race.dataset.counted = 1;
    for (const b of $$("[data-wpm]", race)) {
      const to = +b.dataset.wpm;
      if (reduceMotion) continue;
      const t0 = performance.now();
      const tick = (now) => {
        const p = clamp((now - t0) / 1400);
        b.textContent = Math.round(to * ease(p));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  }, { threshold: 0.4 });
  // as you scroll through, the voice lane takes over more of the row
  const grow = () => {
    if (innerWidth <= 860) { voice.style.flexGrow = ""; return; }
    const r = race.getBoundingClientRect();
    const p = span(innerHeight - r.top, innerHeight * 0.2, innerHeight * 0.9);
    voice.style.flexGrow = (1 + 1.6 * ease(p)).toFixed(3);
  };
  addEventListener("scroll", grow, { passive: true });
  addEventListener("resize", grow, { passive: true });
  grow();
}

/* ------------------------------------------------------------------ *
 * How it works: a pinned, scroll-driven story
 * ------------------------------------------------------------------ */
{
  const section = $("#how");
  const card = $("#story-card");
  const steps = $$(".story-steps li");
  const copy = $$(".sc-step");
  const rawEl = $("#sc-raw");
  const cleanEl = $("#sc-clean");
  const transcript = $(".sc-transcript");
  const pill = $("#story-pill");
  const label = $("#story-pill-label");
  const keys = $$(".sc-keys kbd");
  const orb = orbOf(pill);

  // "~" filler, "!" correction, "^" repeat
  const RAW = "hey ~um can you send the slides to Priya before the meeting, !the !meeting's !at !four, !no !sorry, at five, and ~uh tell her ^the the numbers are final";
  const CLEAN = "Hey, can you send the slides to Priya before the meeting at 5? Tell her the numbers are final.";
  const words = RAW.split(" ").map((w) => {
    const s = document.createElement("span");
    s.className = "w";
    const kind = { "~": "mk mk-fill", "!": "mk mk-fix", "^": "mk mk-rep" }[w[0]];
    if (kind) { s.className += " " + kind; w = w.slice(1); }
    s.textContent = w;
    return s;
  });
  words.forEach((s, i) => { rawEl.append(s); if (i < words.length - 1) rawEl.append(" "); });

  let stepNow = -1;
  const update = () => {
    const r = section.getBoundingClientRect();
    const total = r.height - innerHeight;
    const P = clamp(-r.top / total);

    // card settles in as the section arrives
    const enter = span(innerHeight - r.top, innerHeight * 0.2, innerHeight * 1.05);
    card.style.setProperty("--s", (0.86 + 0.14 * ease(enter)).toFixed(4));
    card.style.setProperty("--zoom", (1.12 - 0.08 * P).toFixed(4));

    // three steps share the pinned stretch
    const a = span(P, 0.02, 0.32); // press
    const b = span(P, 0.32, 0.64); // talk
    const c = span(P, 0.64, 0.96); // text
    const step = P < 0.32 ? 0 : P < 0.64 ? 1 : 2;
    if (step !== stepNow) {
      stepNow = step;
      steps.forEach((li, i) => li.classList.toggle("on", i === step));
      copy.forEach((el, i) => el.classList.toggle("on", i === step));
    }
    steps.forEach((li, i) => li.style.setProperty("--p", [a, b, c][i].toFixed(3)));

    // 1. keys appear, get pressed, pill slides up
    const keysIn = span(a, 0.05, 0.3) * (1 - span(a, 0.75, 0.95));
    card.style.setProperty("--ko", keysIn.toFixed(3));
    card.style.setProperty("--ks", (0.92 + 0.08 * keysIn).toFixed(3));
    const pressed = a > 0.4 && a < 0.55;
    keys.forEach((k) => (k.style.transform = pressed ? "translateY(3px)" : ""));
    const pillIn = span(a, 0.5, 0.75) * (1 - span(c, 0.25, 0.4));
    card.style.setProperty("--po", pillIn.toFixed(3));

    // 2. words arrive as you "talk", then the cleanup marks what it will drop
    card.style.setProperty("--to", (span(b, 0, 0.12) * (1 - span(c, 0.6, 0.85) * 0.0)).toFixed(3));
    const shown = Math.round(span(b, 0.05, 0.75) * words.length);
    words.forEach((w, i) => w.classList.toggle("in", i < shown));
    const marked = b > 0.8 || c > 0;
    transcript.classList.toggle("marked", marked);
    if (orb) {
      orb.hold = true;
      orb.set(c > 0.02 ? "composing" : "listening");
      orb.target = b > 0 && b < 0.8 ? 0.8 : 0.3;
    }
    label.textContent = c > 0.02 ? "cleaning up your yap…" : "keep yapping";

    // 3. the clean version types into the message box
    card.style.setProperty("--co", span(c, 0.25, 0.4).toFixed(3));
    const chars = Math.round(span(c, 0.35, 0.9) * CLEAN.length);
    if (cleanEl.textContent.length !== chars) cleanEl.textContent = CLEAN.slice(0, chars);
  };
  addEventListener("scroll", update, { passive: true });
  addEventListener("resize", update, { passive: true });
  update();
}

/* ------------------------------------------------------------------ *
 * Features: a sticky picture that follows the item you're reading
 * ------------------------------------------------------------------ */
{
  const stage = $("#feat-stage");
  const items = $$(".feat");
  const pics = items.map((item) => stage.appendChild($(".fv", item).cloneNode(true)));
  pics[0].classList.add("on");
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const i = items.indexOf(e.target);
      items.forEach((el, j) => el.classList.toggle("on", j === i));
      pics.forEach((el, j) => el.classList.toggle("on", j === i));
    }
  }, { rootMargin: "-45% 0px -45% 0px" });
  items.forEach((el) => io.observe(el));
}

/* ------------------------------------------------------------------ *
 * The mascot looks at your cursor, blinks, and talks when poked
 * ------------------------------------------------------------------ */
{
  const mascot = $("#mascot");
  const svg = $(".mascot-svg", mascot);
  const eyes = $$(".m-eye", mascot);
  const mouth = $(".m-mouth", mascot);
  const tongue = $(".m-tongue", mascot);
  const bubble = $("#bubble");
  const LINES = ["keep yapping!", "go on, say something", "um… hi!", "ctrl + space, friend", "no servers. promise."];
  let tx = 0, ty = 0, x = 0, y = 0, pointer = null, near = false;

  const aim = () => {
    if (!pointer) return;
    const r = mascot.getBoundingClientRect();
    const dx = pointer.x - (r.left + r.width / 2);
    const dy = pointer.y - (r.top + r.height * 0.4);
    const d = Math.hypot(dx, dy) || 1;
    const reach = Math.min(1, d / 450);
    tx = (dx / d) * reach;
    ty = (dy / d) * reach;
  };
  addEventListener("pointermove", (e) => { pointer = { x: e.clientX, y: e.clientY }; if (near) aim(); }, { passive: true });
  addEventListener("scroll", () => near && aim(), { passive: true });

  // the traced SVG's local space is scaled 10x and flipped vertically
  const face = () => {
    x = mix(x, tx, 0.08);
    y = mix(y, ty, 0.08);
    const ex = x * 30 * 10, ey = -y * 24 * 10;
    eyes.forEach((e) => (e.style.translate = `${ex}px ${ey}px`));
    mouth.style.translate = tongue.style.translate = `${ex * 0.4}px ${ey * 0.4}px`;
    svg.style.rotate = `${x * 4}deg`;
  };
  if (!reduceMotion) {
    onVisible(mascot, (v) => { near = v; if (v) { aim(); loops.add(face); } else loops.delete(face); });
    const blink = () => {
      if (near) eyes.forEach((e) => { e.classList.remove("blink"); void e.getBBox(); e.classList.add("blink"); });
      setTimeout(blink, 2500 + Math.random() * 3500);
    };
    setTimeout(blink, 2000);
  }
  let i = 0, hide = 0;
  mascot.addEventListener("click", () => {
    mascot.classList.remove("yap"); void mascot.offsetWidth; mascot.classList.add("yap");
    bubble.textContent = LINES[i++ % LINES.length];
    bubble.classList.add("show");
    clearTimeout(hide);
    hide = setTimeout(() => bubble.classList.remove("show"), 2000);
  });
}

/* ------------------------------------------------------------------ *
 * FAQ: one open at a time
 * ------------------------------------------------------------------ */
{
  const qs = $$(".qa");
  qs.forEach((d) => d.addEventListener("toggle", () => d.open && qs.forEach((o) => o !== d && (o.open = false))));
}
