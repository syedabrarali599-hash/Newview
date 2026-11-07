"use client";

import { prefersReducedMotion } from "./gsap";

/**
 * Pixel hover for CTAs. Hovering a `.btn` or `[data-pixel-hover]` element
 * grows a field of square pixels outward from where the cursor entered until
 * the whole element is filled (brand black by default, or `--pixel-fill`).
 * Leaving collapses the pixels towards the exit point.
 */

const SELECTOR = ".btn, [data-pixel-hover]";
const FILL_SECONDS = 0.42;

type State = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  p: number;
  target: number;
  ox: number;
  oy: number;
  w: number;
  h: number;
  dpr: number;
  color: string;
  running: boolean;
  last: number;
};

const states = new WeakMap<HTMLElement, State>();

function setup(el: HTMLElement): State {
  let st = states.get(el);
  if (st) return st;
  const canvas = document.createElement("canvas");
  canvas.className = "pixel-fill";
  canvas.setAttribute("aria-hidden", "true");
  el.prepend(canvas);
  st = {
    canvas,
    ctx: canvas.getContext("2d")!,
    p: 0,
    target: 0,
    ox: 0,
    oy: 0,
    w: 0,
    h: 0,
    dpr: 1,
    color: "#220d04",
    running: false,
    last: 0,
  };
  states.set(el, st);
  return st;
}

function resize(el: HTMLElement, st: State) {
  const r = el.getBoundingClientRect();
  st.dpr = Math.min(window.devicePixelRatio || 1, 2);
  st.w = r.width;
  st.h = r.height;
  st.canvas.width = Math.ceil(r.width * st.dpr);
  st.canvas.height = Math.ceil(r.height * st.dpr);
  st.color = getComputedStyle(el).getPropertyValue("--pixel-fill").trim() || "#220d04";
}

function draw(st: State) {
  const { ctx, w, h, dpr, p } = st;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  if (p <= 0) return;
  const cell = Math.max(6, Math.min(22, Math.round(h / 5)));
  const cols = Math.ceil(w / cell);
  const rows = Math.ceil(h / cell);
  // Distance to the farthest corner, so p = 1 always means fully filled.
  const max = Math.max(
    Math.hypot(st.ox, st.oy),
    Math.hypot(w - st.ox, st.oy),
    Math.hypot(st.ox, h - st.oy),
    Math.hypot(w - st.ox, h - st.oy),
  );
  ctx.fillStyle = st.color;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const cx = i * cell + cell / 2;
      const cy = j * cell + cell / 2;
      const d = Math.hypot(cx - st.ox, cy - st.oy) / max;
      const q = Math.min(1, Math.max(0, (p * 1.3 - d) / 0.3));
      if (q <= 0) continue;
      // Snap to whole pixels so filled cells tile without seams.
      const s = q >= 1 ? cell + 1 : Math.max(1, Math.round(cell * q));
      const x = Math.round(cx - s / 2);
      const y = Math.round(cy - s / 2);
      ctx.fillRect(x, y, s, s);
    }
  }
}

function run(el: HTMLElement, st: State) {
  if (st.running) return;
  st.running = true;
  st.last = performance.now();
  const step = (now: number) => {
    const dt = Math.min(0.05, (now - st.last) / 1000);
    st.last = now;
    const dir = Math.sign(st.target - st.p);
    st.p = Math.min(1, Math.max(0, st.p + (dir * dt) / FILL_SECONDS));
    draw(st);
    if (st.p !== st.target) requestAnimationFrame(step);
    else st.running = false;
  };
  requestAnimationFrame(step);
}

function local(el: HTMLElement, e: PointerEvent) {
  const r = el.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

export function initPixelHover(root: Document | HTMLElement = document) {
  const reduced = prefersReducedMotion();

  const enter = (el: HTMLElement, e: PointerEvent) => {
    const st = setup(el);
    resize(el, st);
    const pt = local(el, e);
    st.ox = pt.x;
    st.oy = pt.y;
    st.target = 1;
    el.dataset.pixelActive = "true";
    if (reduced) {
      st.p = 1;
      draw(st);
    } else run(el, st);
  };

  const leave = (el: HTMLElement, e: PointerEvent) => {
    const st = states.get(el);
    if (!st) return;
    const pt = local(el, e);
    st.ox = Math.min(st.w, Math.max(0, pt.x));
    st.oy = Math.min(st.h, Math.max(0, pt.y));
    st.target = 0;
    el.dataset.pixelActive = "false";
    if (reduced) {
      st.p = 0;
      draw(st);
    } else run(el, st);
  };

  // Delegated enter/leave so it works for every CTA on the page.
  const onOver = (e: Event) => {
    const ev = e as PointerEvent;
    if (ev.pointerType === "touch") return;
    const el = (ev.target as Element).closest<HTMLElement>(SELECTOR);
    if (!el || el.contains(ev.relatedTarget as Node | null)) return;
    enter(el, ev);
  };
  const onOut = (e: Event) => {
    const ev = e as PointerEvent;
    const el = (ev.target as Element).closest<HTMLElement>(SELECTOR);
    if (!el || el.contains(ev.relatedTarget as Node | null)) return;
    leave(el, ev);
  };

  root.addEventListener("pointerover", onOver);
  root.addEventListener("pointerout", onOut);
  return () => {
    root.removeEventListener("pointerover", onOver);
    root.removeEventListener("pointerout", onOut);
  };
}
