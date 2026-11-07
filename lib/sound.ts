"use client";

/**
 * Tiny 8-bit sound effects, synthesised with the Web Audio API (no audio
 * files). Browsers only allow sound after the visitor has clicked, tapped or
 * pressed a key, so the audio context is created on the first such gesture.
 * Visitors can switch sound off with the toggle in the navigation; the choice
 * is remembered in localStorage.
 */

type Listener = (on: boolean) => void;

const STORAGE_KEY = "newview-sound";
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = true;
let lastHover = 0;
const lastPlayed = new Map<string, number>();
let noiseBuffer: AudioBuffer | null = null;
const listeners = new Set<Listener>();

function readPref() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v !== null) enabled = v === "on";
  } catch {
    /* storage unavailable: keep the default */
  }
}

if (typeof window !== "undefined") readPref();

function ensureContext() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** Call from any user gesture to allow sound from then on. */
export function unlockAudio() {
  ensureContext();
}

export function isSoundOn() {
  return enabled;
}

export function setSound(on: boolean) {
  enabled = on;
  try {
    localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {
    /* ignore */
  }
  if (on) ensureContext();
  listeners.forEach((l) => l(on));
}

export function onSoundChange(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** One square-wave blip with a fast attack and an exponential decay. */
function blip(
  freq: number,
  at: number,
  dur: number,
  vol: number,
  type: OscillatorType = "square",
  slideTo?: number,
) {
  if (!ctx || !master) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, at + dur);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(vol, at + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(gain).connect(master);
  osc.start(at);
  osc.stop(at + dur + 0.02);
}

/** A short burst of filtered white noise (for glitches, scribbles and whooshes). */
function noise(at: number, dur: number, vol: number, freq: number, q = 1, sweepTo?: number) {
  if (!ctx || !master) return;
  if (!noiseBuffer) {
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.6, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(freq, at);
  if (sweepTo) filter.frequency.exponentialRampToValueAtTime(sweepTo, at + dur);
  filter.Q.value = q;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(vol, at + Math.min(0.02, dur / 3));
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  src.connect(filter).connect(gain).connect(master);
  src.start(at, Math.random() * 0.3);
  src.stop(at + dur + 0.02);
}

/** Skip a sound if the same one played less than `gap` seconds ago. */
function throttled(name: string, gap: number) {
  if (!ctx) return true;
  const now = ctx.currentTime;
  if (now - (lastPlayed.get(name) ?? -1) < gap) return true;
  lastPlayed.set(name, now);
  return false;
}

// Notes of a major pentatonic scale, so random picks always sound pleasant.
const PENTA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98];
const pick = (from: number, to: number) => PENTA[from + Math.floor(Math.random() * (to - from + 1))];

function ready() {
  // A context that is still resuming plays scheduled sounds as soon as it is up.
  return enabled && ctx && ctx.state !== "closed" ? ctx : null;
}

export const sfx = {
  /** Pixels filling a button: a quick rising flutter of tiny blips. */
  pixelsIn() {
    const c = ready();
    if (!c) return;
    const now = c.currentTime;
    if (now - lastHover < 0.07) return;
    lastHover = now;
    const steps = 5;
    for (let i = 0; i < steps; i++) {
      blip(pick(i, i + 3) * 0.5, now + i * 0.022, 0.04, 0.035 - i * 0.003);
    }
  },

  /** Pixels leaving a button: a softer, falling flutter. */
  pixelsOut() {
    const c = ready();
    if (!c) return;
    const now = c.currentTime;
    for (let i = 0; i < 3; i++) {
      blip(pick(4 - i, 5 - i) * 0.5, now + i * 0.024, 0.035, 0.018, "triangle");
    }
  },

  /** Tapping the hero graphic: a bright two-note "coin" chime with sparkle. */
  tap() {
    const c = ready();
    if (!c) return;
    const now = c.currentTime;
    blip(987.77, now, 0.07, 0.06);
    blip(1318.51, now + 0.07, 0.32, 0.055);
    // a few high sparkles that trail off, like the pixel ripple
    for (let i = 0; i < 4; i++) {
      blip(pick(5, 8) * 2, now + 0.12 + i * 0.05, 0.05, 0.012, "triangle");
    }
  },

  /** A pixel cursor becoming yours: a short upward chirp. */
  select() {
    const c = ready();
    if (!c) return;
    blip(660, c.currentTime, 0.08, 0.04, "square", 990);
  },

  /** Hovering a text link: a soft, high tick. */
  tick() {
    const c = ready();
    if (!c || throttled("tick", 0.05)) return;
    blip(pick(5, 8), c.currentTime, 0.03, 0.02, "triangle");
  },

  /** Pressing a link or a small control. */
  click() {
    const c = ready();
    if (!c || throttled("click", 0.05)) return;
    const now = c.currentTime;
    blip(1046.5, now, 0.03, 0.035);
    blip(1567.98, now + 0.03, 0.05, 0.025);
  },

  /** Hovering a project card: a single round blip. */
  card() {
    const c = ready();
    if (!c || throttled("card", 0.08)) return;
    blip(pick(2, 5), c.currentTime, 0.09, 0.03, "triangle", undefined);
  },

  /** The orange card's pixels hopping to new squares. */
  hop() {
    const c = ready();
    if (!c || throttled("hop", 0.3)) return;
    const now = c.currentTime;
    for (let i = 0; i < 9; i++) blip(pick(1, 8), now + i * 0.03, 0.03, 0.016);
  },

  /** Hero grid trail: a quiet note whose pitch follows the height (0 top … 1 bottom). */
  trail(height: number) {
    const c = ready();
    if (!c || throttled("trail", 0.075)) return;
    const idx = Math.max(0, Math.min(PENTA.length - 1, Math.round((1 - height) * (PENTA.length - 1))));
    blip(PENTA[idx], c.currentTime, 0.06, 0.012, "triangle");
  },

  /** Pixels gathering into an illustration: a rising sparkle. */
  gather() {
    const c = ready();
    if (!c || throttled("gather", 0.25)) return;
    const now = c.currentTime;
    for (let i = 0; i < 6; i++) blip(PENTA[i + 2] * 2, now + i * 0.045, 0.06, 0.012, "triangle");
  },

  /** The glitch line sweeping between two service illustrations. */
  glitch() {
    const c = ready();
    if (!c || throttled("glitch", 0.4)) return;
    const now = c.currentTime;
    noise(now, 0.12, 0.05, 2400, 6);
    blip(110, now, 0.05, 0.03, "square", 70);
    blip(1760, now + 0.05, 0.03, 0.012);
  },

  /** Per-illustration hover sounds. */
  art(id: string) {
    const c = ready();
    if (!c || throttled(`art-${id}`, 0.5)) return;
    const now = c.currentTime;
    if (id === "nib") {
      // a quick scribble
      for (let i = 0; i < 4; i++) noise(now + i * 0.05, 0.04, 0.03, 3000 + i * 600, 3);
    } else if (id === "blocks") {
      // four pops as the tiles pull apart
      [0, 1, 2, 3].forEach((i) => blip(392 + i * 98, now + i * 0.05, 0.05, 0.035, "square", 196 + i * 49));
    } else if (id === "megaphone") {
      // rising beeps, like the sound waves
      [523.25, 659.25, 783.99].forEach((f, i) => blip(f, now + i * 0.09, 0.07, 0.03));
    } else if (id === "chat") {
      // typing
      for (let i = 0; i < 5; i++) noise(now + i * 0.06 + Math.random() * 0.02, 0.025, 0.035, 4500, 2);
    } else if (id === "plan") {
      // three check ticks
      [0, 1, 2].forEach((i) => blip(1174.66 + i * 196, now + i * 0.11, 0.05, 0.03));
    } else if (id === "rocket") {
      // a rising whoosh
      noise(now, 0.45, 0.04, 400, 1.2, 3000);
      blip(220, now, 0.4, 0.015, "triangle", 880);
    }
  },

  /** A press on the little browser's button, or the bulb lighting up. */
  ding() {
    const c = ready();
    if (!c || throttled("ding", 0.4)) return;
    const now = c.currentTime;
    blip(1567.98, now, 0.25, 0.035, "triangle");
    blip(2093, now + 0.04, 0.3, 0.02, "triangle");
  },

  /** Comparison switch. */
  switchOn() {
    const c = ready();
    if (!c) return;
    const now = c.currentTime;
    blip(523.25, now, 0.06, 0.035);
    blip(783.99, now + 0.06, 0.1, 0.035);
  },
  switchOff() {
    const c = ready();
    if (!c) return;
    const now = c.currentTime;
    blip(392, now, 0.06, 0.035);
    blip(196, now + 0.06, 0.14, 0.035, "square", 150);
  },

  /** Mobile menu opening / closing: a quick sweep up or down. */
  menu(open: boolean) {
    const c = ready();
    if (!c) return;
    const now = c.currentTime;
    const notes = open ? [392, 523.25, 659.25, 783.99] : [783.99, 659.25, 523.25, 392];
    notes.forEach((f, i) => blip(f, now + i * 0.035, 0.05, 0.025, "triangle"));
  },

  /** Sound switched on: a little confirmation jingle. */
  on() {
    const c = ready();
    if (!c) return;
    const now = c.currentTime;
    [523.25, 659.25, 783.99].forEach((f, i) => blip(f, now + i * 0.06, 0.09, 0.04));
  },
};

/**
 * Page-wide hover/click sounds driven by data attributes:
 *   data-sfx-hover="tick" | "card" | "hop"   — played when the pointer enters
 *   data-sfx-click="click"                   — played on click/tap
 */
export function initSoundEvents(root: Document | HTMLElement = document) {
  type Name = "tick" | "card" | "hop" | "click";
  const play = (name: string | undefined) => {
    if (name && name in sfx) (sfx[name as Name] as () => void)();
  };
  const onOver = (e: Event) => {
    const ev = e as PointerEvent;
    if (ev.pointerType === "touch") return;
    const el = (ev.target as Element).closest<HTMLElement>("[data-sfx-hover]");
    if (!el || el.contains(ev.relatedTarget as Node | null)) return;
    play(el.dataset.sfxHover);
  };
  const onClick = (e: Event) => {
    const el = (e.target as Element).closest<HTMLElement>("[data-sfx-click]");
    if (el) play(el.dataset.sfxClick);
  };
  root.addEventListener("pointerover", onOver);
  root.addEventListener("click", onClick);
  return () => {
    root.removeEventListener("pointerover", onOver);
    root.removeEventListener("click", onClick);
  };
}
