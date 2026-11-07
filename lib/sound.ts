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

  /** Sound switched on: a little confirmation jingle. */
  on() {
    const c = ready();
    if (!c) return;
    const now = c.currentTime;
    [523.25, 659.25, 783.99].forEach((f, i) => blip(f, now + i * 0.06, 0.09, 0.04));
  },
};
