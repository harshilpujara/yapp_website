// yapp landing page. Plain ES module, no build step.
// The orb animations use the same thinking-orbs engine the yapp app vendors for its
// recording pill, painted in yapp's purple -> pink the same way pill.js does.
import { MODE_FRAMES, resolvePreset } from "./vendor/thinking-orbs-engine.js";

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const mix = (a, b, f) => a + (b - a) * f;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ *
 * Orb renderer
 * ------------------------------------------------------------------ */
const PURPLE = [124, 92, 255];
const PINK = [255, 110, 199];

class Orb {
  constructor(canvas, { preset = 64, state = "listening", alpha = 1, dotScale = 1 } = {}) {
    this.dotScale = dotScale;
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.preset = preset;
    this.alpha = alpha;
    this.t = Math.random() * 10;
    this.level = 0;
    this.k = 1;
    this.from = null; // previous mode while cross-fading
    this.fade = 1;
    this.setState(state, true);
    this.resize();
  }
  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = this.canvas.clientWidth || 40;
    this.canvas.width = this.canvas.height = Math.round(w * dpr);
  }
  setState(state, instant = false) {
    const p = resolvePreset(state, this.preset);
    const next = { frame: MODE_FRAMES[p.mode], opts: p.opts, speed: p.speed, state };
    if (this.mode && !instant && this.mode.state !== state) {
      this.from = this.mode;
      this.fade = 0;
    }
    this.mode = next;
  }
  paintFrame(frame, k, alpha) {
    const { ctx, canvas, preset } = this;
    const px = canvas.width / preset;
    const c = preset / 2;
    ctx.setTransform(px * k, 0, 0, px * k, canvas.width / 2 - c * px * k, canvas.height / 2 - c * px * k);
    for (const d of frame.dots) {
      const near = 1 - clamp(d.white, 0, 1); // dark background: near dots read bright
      const f = clamp(d.x / preset, 0, 1);
      const lift = 0.05 + 0.3 * near;
      const r = Math.round(mix(mix(PURPLE[0], PINK[0], f), 255, lift));
      const g = Math.round(mix(mix(PURPLE[1], PINK[1], f), 255, lift));
      const b = Math.round(mix(mix(PURPLE[2], PINK[2], f), 255, lift));
      ctx.fillStyle = `rgba(${r},${g},${b},${(d.a ?? 1) * (0.55 + 0.45 * near) * alpha * this.alpha})`;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r * this.dotScale, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  step(dt) {
    const speedMul = 0.6 + 2.0 * this.level;
    this.k = mix(this.k, 0.88 + 0.24 * this.level, 0.2);
    this.t += dt * this.mode.speed * speedMul * 0.5;
    if (this.fade < 1) this.fade = Math.min(1, this.fade + dt * 1.6);
    this.draw();
  }
  draw() {
    const { ctx, canvas } = this;
    // Canvas may have been measured before layout settled; keep the backing store in sync.
    const want = Math.round((canvas.clientWidth || 40) * Math.min(2, window.devicePixelRatio || 1));
    if (Math.abs(want - canvas.width) > 1) this.resize();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (this.from && this.fade < 1) {
      this.paintFrame(this.from.frame(this.preset, this.t, this.from.opts), this.k, 1 - this.fade);
    }
    this.paintFrame(this.mode.frame(this.preset, this.t, this.mode.opts), this.k, this.fade);
  }
}

// One shared animation loop; each orb only runs while its canvas is on screen.
const loops = new Set();
let lastTick = 0;
function tick(now) {
  const dt = Math.min(0.05, (now - lastTick) / 1000 || 0.016);
  lastTick = now;
  for (const fn of loops) fn(dt, now);
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

function whenVisible(el, onChange, threshold = 0) {
  const io = new IntersectionObserver(([e]) => onChange(e.isIntersecting), { threshold });
  io.observe(el);
}

/* ------------------------------------------------------------------ *
 * Hero orb: rolls through the app's states and listens to the CTAs
 * ------------------------------------------------------------------ */
const heroCanvas = $("#hero-orb");
const heroOrb = new Orb(heroCanvas, { preset: 64, state: "listening", dotScale: 0.62 });
let heroBoost = 0;
{
  const states = ["listening", "composing", "breathing", "searching"];
  let i = 0;
  let since = 0;
  let voice = 0;
  const run = (dt, now) => {
    since += dt;
    if (since > 7 && !reduceMotion) {
      since = 0;
      i = (i + 1) % states.length;
      heroOrb.setState(states[i]);
    }
    // a fake "voice" envelope so the orb breathes like someone is talking
    const talk = 0.5 + 0.5 * Math.sin(now / 900) * Math.sin(now / 370 + 1.3);
    voice = mix(voice, clamp(talk * 0.55 + heroBoost, 0, 1), 0.06);
    heroOrb.level = voice;
    heroOrb.step(dt);
  };
  if (reduceMotion) {
    heroOrb.draw();
    addEventListener("load", () => heroOrb.draw());
    addEventListener("resize", () => heroOrb.draw(), { passive: true });
  } else {
    whenVisible(heroCanvas, (v) => (v ? loops.add(run) : loops.delete(run)));
  }
  heroCanvas.classList.add("ready");
  $$("[data-orb-boost]").forEach((el) => {
    el.addEventListener("pointerenter", () => (heroBoost = 0.55));
    el.addEventListener("pointerleave", () => (heroBoost = 0));
  });
}

// Spotlight on the dot grid + gentle parallax on the orb.
{
  const hero = $(".hero");
  const grid = $(".dotgrid");
  let tx = 0, ty = 0, x = 0, y = 0, active = false;
  if (finePointer && !reduceMotion) {
    hero.addEventListener("pointermove", (e) => {
      const r = hero.getBoundingClientRect();
      grid.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
      grid.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
      tx = ((e.clientX - r.left) / r.width - 0.5) * -40;
      ty = ((e.clientY - r.top) / r.height - 0.5) * -30;
      if (!active) { active = true; loops.add(follow); }
    });
  }
  function follow() {
    x = mix(x, tx, 0.06);
    y = mix(y, ty, 0.06);
    heroCanvas.style.setProperty("--ox", `${x.toFixed(2)}px`);
    heroCanvas.style.setProperty("--oy", `${y.toFixed(2)}px`);
    if (Math.abs(x - tx) < 0.05 && Math.abs(y - ty) < 0.05) { loops.delete(follow); active = false; }
  }
}

addEventListener("resize", () => heroOrb.resize(), { passive: true });

/* ------------------------------------------------------------------ *
 * Count-up stats (easeOutCubic; supports counting *down* to zero)
 * ------------------------------------------------------------------ */
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
function countUp(el, delay, duration) {
  const to = parseFloat(el.dataset.count);
  const from = parseFloat(el.dataset.from ?? 0);
  const dec = parseInt(el.dataset.decimals ?? 0, 10);
  const pre = el.dataset.prefix ?? "";
  const suf = el.dataset.suffix ?? "";
  const fmt = (v) => `${pre}${v.toFixed(dec)}${suf}`;
  if (reduceMotion) { el.textContent = fmt(to); return; }
  el.textContent = fmt(from);
  setTimeout(() => {
    const start = performance.now();
    const frame = (now) => {
      const p = Math.min(1, (now - start) / duration);
      el.textContent = fmt(from + (to - from) * easeOut(p));
      if (p < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }, delay);
}
{
  const counters = $$("[data-count]");
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      io.unobserve(e.target);
      const i = counters.indexOf(e.target);
      const inHero = e.target.closest(".hero");
      countUp(e.target, inHero ? 780 + i * 90 : 200, 1500 + i * 80);
    }
  }, { threshold: 0.25 });
  counters.forEach((c) => io.observe(c));
}

/* ------------------------------------------------------------------ *
 * Scroll reveal
 * ------------------------------------------------------------------ */
{
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    }
  }, { threshold: 0.14, rootMargin: "0px 0px -6% 0px" });
  $$(".reveal").forEach((el) => io.observe(el));
}

/* ------------------------------------------------------------------ *
 * Header: scroll-spy with the sliding three-dot indicator
 * ------------------------------------------------------------------ */
{
  const nav = $(".nav-pill");
  const dots = $(".nav-dots");
  const links = $$("a[data-spy]", nav);
  const sections = links.map((a) => document.getElementById(a.dataset.spy));
  const place = (a) => {
    links.forEach((l) => l.classList.toggle("active", l === a));
    if (!a) { dots.classList.remove("on"); return; }
    const x = a.offsetLeft + a.offsetWidth / 2 - 1.5;
    dots.style.setProperty("--x", `${x}px`);
    dots.classList.add("on");
  };
  const update = () => {
    const y = innerHeight * 0.4;
    let current = null;
    sections.forEach((s, i) => {
      const r = s.getBoundingClientRect();
      if (r.top <= y && r.bottom > y) current = links[i];
    });
    place(current);
  };
  addEventListener("scroll", update, { passive: true });
  addEventListener("resize", update, { passive: true });
  document.fonts?.ready.then(update);
  update();
}

// Header tucks away while scrolling down, comes back on the way up.
{
  const header = $("#header");
  let lastY = scrollY;
  addEventListener("scroll", () => {
    const y = scrollY;
    const down = y > lastY + 4;
    const up = y < lastY - 4;
    if (down && y > 240 && !document.body.classList.contains("menu-open")) header.classList.add("tucked");
    if (up || y < 240) header.classList.remove("tucked");
    if (down || up) lastY = y;
  }, { passive: true });
}

/* ------------------------------------------------------------------ *
 * Mobile menu
 * ------------------------------------------------------------------ */
{
  const burger = $("#burger");
  const menu = $("#mobile-menu");
  const overlay = $("#menu-overlay");
  const set = (open) => {
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    menu.hidden = overlay.hidden = !open;
    document.body.classList.toggle("menu-open", open);
  };
  burger.addEventListener("click", () => set(burger.getAttribute("aria-expanded") !== "true"));
  overlay.addEventListener("click", () => set(false));
  $$("a", menu).forEach((a) => a.addEventListener("click", () => set(false)));
  addEventListener("keydown", (e) => { if (e.key === "Escape") set(false); });
  addEventListener("resize", () => { if (innerWidth > 720) set(false); }, { passive: true });
}

/* ------------------------------------------------------------------ *
 * Magnetic buttons + card spotlight
 * ------------------------------------------------------------------ */
if (finePointer && !reduceMotion) {
  $$(".magnetic").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - r.left - r.width / 2) * 0.22;
      const dy = (e.clientY - r.top - r.height / 2) * 0.32;
      el.style.transform = `translate(${dx}px, ${dy}px)`;
    });
    el.addEventListener("pointerleave", () => (el.style.transform = ""));
  });
  $$(".card").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - r.left}px`);
      card.style.setProperty("--my", `${e.clientY - r.top}px`);
    });
  });
}

/* ------------------------------------------------------------------ *
 * Feature-card loops
 * ------------------------------------------------------------------ */
{
  const filler = $(".vis-filler");
  if (!reduceMotion) {
    setInterval(() => filler.classList.toggle("clean"), 2400);
  } else {
    filler.classList.add("clean");
  }

  const roll = $$("#lang-roll span");
  const names = ["Spanish", "Hindi", "Japanese", "French", "Gujarati"];
  const nameEl = $("#lang-name");
  let li = 0;
  roll[0].classList.add("on");
  if (!reduceMotion) {
    setInterval(() => {
      const prev = roll[li];
      prev.classList.remove("on");
      prev.classList.add("out");
      setTimeout(() => prev.classList.remove("out"), 520);
      li = (li + 1) % roll.length;
      roll[li].classList.add("on");
      nameEl.textContent = names[li];
    }, 2200);
  }
}

/* ------------------------------------------------------------------ *
 * The demo: Ctrl+Space -> talk -> clean text at the cursor
 * "~word" = cut by cleanup, "^word" = spoken command
 * ------------------------------------------------------------------ */
const SCENES = [
  {
    title: "Mail — New message",
    meta: { to: "sarah@studio.co", subj: "Our call" },
    lang: "English",
    said: "~um hey sarah ~so ~uh can we move the call to ~tuesday, ~no, wednesday at three",
    clean: "Hey Sarah, can we move the call to Wednesday at 3?",
  },
  {
    title: "Slack — #launch",
    meta: null,
    lang: "English",
    said: "~okay ~so the new landing page looks ~uh really good ^new ^line can you ship it today",
    clean: "The new landing page looks really good.\nCan you ship it today?",
  },
  {
    title: "Notes — Friday",
    meta: null,
    lang: "Spanish",
    said: "~eh mañana llego ~a ~las ~ocho, ~no, ~mejor a las nueve",
    clean: "Mañana llego a las nueve.",
  },
  {
    title: "Mail — Re: Feedback",
    meta: { to: "team@studio.co", subj: "Re: Feedback" },
    lang: "English",
    said: "thanks so much for the help ~um ^sign ^off",
    clean: "Thanks so much for the help!\n\nRegards, Harshil",
  },
];

{
  const demo = $("#demo");
  const steps = $$("#steps .step");
  const said = $(".said");
  const saidText = $("#said-text");
  const typed = $("#typed");
  const pill = $("#rec-pill");
  const label = $("#rec-label");
  const kbd = $("#kbd-float");
  const title = $("#win-title");
  const meta = $("#win-meta");
  const chip = $("#lang-chip");
  const recOrb = new Orb($("#rec-orb"), { preset: 20, state: "listening" });

  let visible = false;
  let orbOn = false;
  let targetLevel = 0;
  const orbLoop = (dt) => {
    targetLevel *= 0.9;
    recOrb.level = mix(recOrb.level, targetLevel, 0.3);
    recOrb.step(dt);
  };
  const orbRun = (on) => {
    if (on && !orbOn) loops.add(orbLoop);
    if (!on) loops.delete(orbLoop);
    orbOn = on;
  };

  whenVisible(demo, (v) => (visible = v), 0.2);
  const waitVisible = async () => { while (!visible) await sleep(250); };
  const wait = async (ms) => { await sleep(ms); await waitVisible(); };

  const setStep = (n, dur) => {
    steps.forEach((s, i) => {
      s.classList.toggle("on", i === n);
      if (i === n) {
        s.style.setProperty("--dur", `${dur}ms`);
        // restart the progress bar
        s.classList.remove("on"); void s.offsetWidth; s.classList.add("on");
      }
    });
  };
  const tap = async () => {
    kbd.classList.add("show", "tap");
    await sleep(160);
    kbd.classList.remove("tap");
  };

  const setScene = (sc) => {
    title.textContent = sc.title;
    meta.style.display = sc.meta ? "" : "none";
    if (sc.meta) { $("#win-to").textContent = sc.meta.to; $("#win-subj").textContent = sc.meta.subj; }
    chip.textContent = sc.lang;
    chip.classList.remove("pop"); void chip.offsetWidth; chip.classList.add("pop");
    typed.textContent = "";
    saidText.textContent = "";
  };

  const renderStatic = (sc) => {
    setScene(sc);
    typed.textContent = sc.clean;
    steps.forEach((s, i) => s.classList.toggle("on", i === 2));
  };

  async function play(sc) {
    setScene(sc);
    const words = sc.said.split(" ").map((raw) => {
      const span = document.createElement("span");
      span.className = "w";
      if (raw.startsWith("~")) { span.classList.add("filler"); raw = raw.slice(1); }
      if (raw.startsWith("^")) { span.classList.add("cmd"); raw = raw.slice(1); }
      span.textContent = raw;
      return span;
    });
    words.forEach((w, i) => { saidText.append(w); if (i < words.length - 1) saidText.append(" "); });

    // 1. press the shortcut, pill slides up and listens
    const talkMs = words.length * 190;
    setStep(0, 1200);
    await wait(500);
    await tap();
    recOrb.setState("listening", true);
    orbRun(true);
    pill.classList.add("in");
    label.textContent = "keep yapping";
    await wait(700);

    // 2. talk
    setStep(1, talkMs + 1700);
    said.classList.add("show");
    for (const w of words) {
      w.classList.add("in");
      targetLevel = 0.55 + Math.random() * 0.45;
      await wait(150 + Math.random() * 80);
    }
    await wait(350);
    await tap();
    recOrb.setState("composing");
    label.textContent = "cleaning up your yap…";
    targetLevel = 0;
    await wait(250);
    words.filter((w) => w.classList.contains("filler")).forEach((w, i) => setTimeout(() => w.classList.add("cut"), i * 90));
    await wait(1050);

    // 3. text lands at the cursor
    pill.classList.remove("in");
    kbd.classList.remove("show");
    setStep(2, 3600);
    const mark = document.createElement("span");
    mark.className = "new";
    typed.append(mark);
    for (const ch of sc.clean) {
      mark.textContent += ch;
      await sleep(ch === " " ? 10 : 22);
    }
    setTimeout(() => orbRun(false), 400);
    await wait(900);
    mark.classList.remove("new");
    said.classList.remove("show");
    await wait(2300);
  }

  if (reduceMotion) {
    renderStatic(SCENES[0]);
  } else {
    (async () => {
      for (let i = 0; ; i = (i + 1) % SCENES.length) {
        await waitVisible();
        await play(SCENES[i]);
      }
    })();
  }
}

/* ------------------------------------------------------------------ *
 * Footer mascot: its face follows the cursor, blinks, and yaps on click
 * ------------------------------------------------------------------ */
{
  const mascot = $("#mascot");
  const svg = $(".mascot-svg", mascot);
  const eyes = $$(".m-eye", mascot);
  const mouth = $(".m-mouth", mascot);
  const tongue = $(".m-tongue", mascot);
  const bubble = $("#bubble");
  const LINES = [
    "keep yapping!",
    "say it, don't type it",
    "um… I mean: hi!",
    "ctrl + space, friend",
    "no servers. just vibes.",
    "cleaning up your yap…",
    "free. like, actually.",
  ];
  let tx = 0, ty = 0, x = 0, y = 0;
  let pointer = null;
  let near = false;

  const aim = () => {
    if (!pointer) return;
    const r = mascot.getBoundingClientRect();
    const cx = r.left + r.width * 0.5;
    const cy = r.top + r.height * 0.42;
    const dx = pointer.x - cx;
    const dy = pointer.y - cy;
    const d = Math.hypot(dx, dy) || 1;
    const reach = Math.min(1, d / 500);
    tx = (dx / d) * reach;
    ty = (dy / d) * reach;
  };
  addEventListener("pointermove", (e) => { pointer = { x: e.clientX, y: e.clientY }; if (near) aim(); }, { passive: true });
  addEventListener("scroll", () => near && aim(), { passive: true });

  // Local SVG space is scaled 10x and flipped vertically (potrace output), so
  // view-space offsets are multiplied by 10 and y is negated.
  const face = () => {
    x = mix(x, tx, 0.08);
    y = mix(y, ty, 0.08);
    const ex = x * 34 * 10, ey = -y * 26 * 10;
    eyes.forEach((e) => (e.style.translate = `${ex}px ${ey}px`));
    mouth.style.translate = tongue.style.translate = `${ex * 0.4}px ${ey * 0.4}px`;
    svg.style.rotate = `${x * 5}deg`;
  };
  if (!reduceMotion) {
    whenVisible(mascot, (v) => { near = v; if (v) { aim(); loops.add(face); } else loops.delete(face); });
    const blink = () => {
      if (near) {
        eyes.forEach((e) => { e.classList.remove("blink"); void e.getBBox(); e.classList.add("blink"); });
      }
      setTimeout(blink, 2600 + Math.random() * 3400);
    };
    setTimeout(blink, 2000);
  }

  let li = 0;
  let hideT = 0;
  mascot.addEventListener("click", () => {
    mascot.classList.remove("yap"); void mascot.offsetWidth; mascot.classList.add("yap");
    bubble.textContent = LINES[li++ % LINES.length];
    bubble.classList.add("show");
    clearTimeout(hideT);
    hideT = setTimeout(() => bubble.classList.remove("show"), 2200);
  });
}

/* ------------------------------------------------------------------ *
 * FAQ: one open at a time
 * ------------------------------------------------------------------ */
{
  const items = $$(".qa");
  items.forEach((d) => d.addEventListener("toggle", () => {
    if (d.open) items.forEach((o) => o !== d && (o.open = false));
  }));
}
