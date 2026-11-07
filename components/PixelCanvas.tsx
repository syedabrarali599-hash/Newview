"use client";

import { useEffect, useImperativeHandle, useRef, type Ref, type RefObject } from "react";
import { gsap, prefersReducedMotion } from "@/lib/gsap";
import type { PixelArtDef } from "./pixelArt.data";

/**
 * Canvas pixel-art renderer shared by the service stack, the getting-started
 * cards and the CTA.
 *
 *  - pixels fly in to form the art on `assemble()`; once settled, every
 *    layer moves as one solid piece, so pixels always tile without gaps
 *  - each named layer reacts to the cursor in its own way (see `layerFx`)
 *  - with several arts, `scene()` can report a horizontal "line": art A is
 *    drawn above it and art B below, with a glitchy scan-line band where they
 *    meet (the service-card scroll transition)
 */

export type PixelCanvasHandle = { assemble: (index?: number) => void };

export type Scene = { a: number; b?: number; line?: number };

type Props = {
  arts: PixelArtDef[];
  /** Element whose pointer movement drives the interaction. */
  host: RefObject<HTMLElement | null>;
  label: string;
  className?: string;
  /** Draw the faint pixel grid behind the art. */
  grid?: boolean;
  /** Which art(s) to show right now; `line` is in CSS px from the canvas top. */
  scene?: () => Scene;
  /** Arts that start scattered and wait for `assemble()` (default: all). */
  scattered?: (index: number) => boolean;
  ref?: Ref<PixelCanvasHandle>;
};

const SETTLE_SECONDS = 1.1; // after the last pixel lands, layers snap to the lattice

// Critically damped: pixels glide into place without bouncing.
const STIFFNESS = 110;
const DAMPING = 21;

type Particle = {
  layer: number;
  ch: string;
  hx: number;
  hy: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  delay: number;
};

type ArtState = {
  def: PixelArtDef;
  particles: Particle[];
  assembled: boolean;
  assembleAt: number;
  settleAfter: number;
  /** smoothed per-layer offsets */
  offsets: { dx: number; dy: number }[];
  /** offsets/alpha still easing towards their targets */
  moving: boolean;
  layer: HTMLCanvasElement;
  lctx: CanvasRenderingContext2D;
};

type Env = {
  t: number;
  /** pointer in grid cells */
  px: number;
  py: number;
  active: boolean;
  /** 0..1, eases towards 1 while the pointer is over the host */
  near: number;
  cols: number;
  rows: number;
};

type Fx = {
  dx?: number;
  dy?: number;
  alpha?: number;
  /** per-cell alpha multiplier */
  alphaAt?: (hx: number, hy: number) => number;
  recolor?: Record<string, string>;
};

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const pulse = (t: number) => 0.5 + 0.5 * Math.sin(t);

/**
 * Per-layer reactions. Offsets are whole-layer translations only (no
 * rotation or scaling), which keeps every pixel on the grid. The service
 * illustrations stay still until you hover them.
 */
function layerFx(art: string, layer: string, e: Env): Fx {
  const lx = e.active ? clamp((e.px - e.cols / 2) / (e.cols / 2), -1, 1) * e.near : 0;
  const ly = e.active ? clamp((e.py - e.rows / 2) / (e.rows / 2), -1, 1) * e.near : 0;
  const twinkle = (ph = 0) => 1 - e.near * 0.65 * pulse(e.t * 4 + ph);
  switch (art) {
    case "nib":
      if (layer === "nib" || layer === "collar") return { dx: lx * 1.2, dy: ly * 0.8 };
      if (layer === "spark") return { alpha: twinkle() };
      if (layer === "spark2") return { alpha: twinkle(2) };
      return {};
    case "browser": {
      // The little cursor follows yours across the window.
      const cx = e.active ? clamp(e.px - 20, -13, 5) * e.near : 0;
      const cy = e.active ? clamp(e.py - 20, -11, 3) * e.near : 0;
      if (layer === "cursor") return { dx: cx, dy: cy };
      if (layer === "button") {
        const over = 20 + cx >= 17 && 20 + cx <= 23 && 20 + cy >= 19 && 20 + cy <= 22;
        return over && e.near > 0.5 ? { recolor: { o: "#c94100" } } : {};
      }
      if (layer === "spark") return { alpha: twinkle() };
      return {};
    }
    case "blocks": {
      // The tiles pull apart into an exploded view.
      const i = Number(layer.slice(-1));
      const ox = i % 2 ? 1 : -1;
      const oy = i > 1 ? 1 : -1;
      return { dx: ox * 1.3 * e.near + lx * 0.4, dy: oy * 1.3 * e.near + ly * 0.4 };
    }
    case "megaphone": {
      if (layer === "horn") return { dx: -Math.max(0, Math.sin(e.t * 12)) * 0.5 * e.near };
      // Waves are still at rest and ripple outwards while hovered.
      const i = Number(layer.slice(-1));
      const ph = (e.t * 1.6 - i * 0.28 + 3) % 1;
      const moving = clamp(Math.sin(ph * Math.PI) * 1.4, 0, 1);
      return { alpha: 1 - e.near + e.near * moving, dx: e.near * ph * 1.2 };
    }
    case "chat":
      if (layer === "bubbleA") return { dy: Math.sin(e.t * 1.8) * 0.3 - e.near * 0.6, dx: -e.near * 0.5 };
      if (layer === "bubbleB") return { dy: Math.sin(e.t * 1.8 + 1.4) * 0.3 + e.near * 0.4, dx: e.near * 0.5 };
      if (layer === "dots")
        return {
          dy: Math.sin(e.t * 1.8 + 1.4) * 0.3 + e.near * 0.4,
          dx: e.near * 0.5,
          alphaAt: (hx) => 0.35 + 0.65 * pulse(e.t * 7 - hx * 0.9),
        };
      if (layer === "rays") return { alpha: 0.4 + 0.6 * pulse(e.t * 4) };
      if (layer === "spark") return { alpha: 0.35 + 0.65 * pulse(e.t * 3) };
      return {};
    case "plan": {
      if (layer.startsWith("check")) {
        const i = Number(layer.slice(-1));
        const cycle = (e.t * (0.45 + e.near * 0.5)) % 1.6;
        return { alpha: cycle > i * 0.3 ? 1 : 0, dy: Math.sin(e.t * 1.6) * 0.25 - e.near * 0.4 };
      }
      if (layer === "doc") return { dy: Math.sin(e.t * 1.6) * 0.25 - e.near * 0.4 };
      if (layer === "rays") return { alpha: 0.4 + 0.6 * pulse(e.t * 4) };
      if (layer === "spark") return { alpha: 0.35 + 0.65 * pulse(e.t * 3) };
      return {};
    }
    case "rocket": {
      const lift = -e.near * 1.6 + Math.sin(e.t * 2.2) * 0.3;
      if (layer === "rocket") return { dy: lift };
      if (layer === "flame1") return { dy: lift, alpha: Math.sin(e.t * 22) > 0 ? 1 : 0 };
      if (layer === "flame2") return { dy: lift, alpha: Math.sin(e.t * 22) > 0 ? 0 : 1 };
      if (layer === "spark") return { alpha: 0.35 + 0.65 * pulse(e.t * 3) };
      return {};
    }
    case "idea": {
      const glow = e.active ? clamp(1.3 - Math.hypot(e.px - 18.5, e.py - 14.5) / 22, 0.35, 1) : 0.6;
      if (layer === "rays") return { alpha: glow * (0.6 + 0.4 * pulse(e.t * 4)) };
      if (layer === "bulb") return { recolor: glow > 0.85 ? { y: "#ffe45c" } : undefined };
      if (layer === "arrow1" || layer === "arrow2")
        // A wave runs along the dots into the head, which nudges forward.
        return {
          dx: Math.max(0, Math.sin(e.t * 3)) * 0.6,
          alphaAt: (hx) => 0.45 + 0.55 * pulse(e.t * 6 - hx * 1.3),
        };
      if (layer === "win2") return { dy: -e.near * 0.5 };
      if (layer === "click") return { dy: -e.near * 0.5 + (Math.sin(e.t * 3.5) > 0.75 ? 0.4 : 0) };
      if (layer === "cursor") {
        // Your cursor in the picture follows the real one.
        if (!e.active) return {};
        return { dx: clamp(e.px - 13, -6, 62) * e.near, dy: clamp(e.py - 22, -18, 12) * e.near };
      }
      if (layer === "spark") return { alpha: 0.4 + 0.6 * pulse(e.t * 3) };
      return {};
    }
  }
  return {};
}

function build(def: PixelArtDef, scattered: boolean, reduced: boolean): Particle[] {
  const out: Particle[] = [];
  const cx = def.cols / 2;
  const cy = def.rows / 2;
  def.layers.forEach((layer, li) => {
    layer.rows.forEach((row, r) => {
      for (let c = 0; c < row.length; c++) {
        const ch = row[c];
        if (ch === ".") continue;
        const p: Particle = { layer: li, ch, hx: c, hy: r, x: c, y: r, vx: 0, vy: 0, alpha: 1, delay: 0 };
        if (scattered && !reduced) {
          // A gentle gather: each pixel drifts in from a short way off and
          // fades up, settling from the centre outwards.
          const ang = Math.random() * Math.PI * 2;
          const dist = 1.5 + Math.random() * 3.5;
          p.x = c + Math.cos(ang) * dist;
          p.y = r + Math.sin(ang) * dist + 1.5;
          p.alpha = 0;
          p.delay = Math.random() * 0.18 + (Math.hypot(c - cx, r - cy) / Math.hypot(cx, cy)) * 0.35;
        }
        out.push(p);
      }
    });
  });
  return out;
}

/** Arts with ambient (always-on) animation; the others only move when hovered. */
const ALWAYS_ANIMATED = new Set(["chat", "plan", "rocket", "idea"]);

export default function PixelCanvas({ arts, host, label, className, grid, scene, scattered, ref }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const states = useRef<ArtState[]>([]);
  const clock = useRef(0);

  useImperativeHandle(ref, () => ({
    assemble(index = 0) {
      const st = states.current[index];
      if (!st || st.assembled) return;
      st.assembled = true;
      st.assembleAt = clock.current;
    },
  }));

  useEffect(() => {
    const wrap = box.current!;
    const cv = canvas.current!;
    const ctx = cv.getContext("2d")!;
    const hostEl = host.current ?? wrap;
    const reduced = prefersReducedMotion();
    const cols = arts[0].cols;
    const rows = arts[0].rows;

    states.current = arts.map((def, i) => {
      const isScattered = scattered ? scattered(i) : true;
      const layer = document.createElement("canvas");
      const particles = build(def, isScattered, reduced);
      return {
        def,
        particles,
        assembled: !isScattered || reduced,
        assembleAt: -10,
        settleAfter: Math.max(0, ...particles.map((p) => p.delay)) + SETTLE_SECONDS,
        offsets: def.layers.map(() => ({ dx: 0, dy: 0 })),
        moving: false,
        layer,
        lctx: layer.getContext("2d")!,
      };
    });

    // Arts are composited here during a transition, so the glitch band never
    // touches the grid underneath.
    const comp = document.createElement("canvas");
    const cctx = comp.getContext("2d")!;
    // Pixel art is drawn at 1 canvas pixel per CSS pixel with whole-number
    // cells, and scaled up crisply by CSS (image-rendering: pixelated):
    // identical on screen, but a quarter of the work on retina displays.
    let w = 0;
    let h = 0;
    let cell = 0;
    let visible = false;
    let lastKey = "";
    let force = true;
    const env: Env = { t: 0, px: -99, py: -99, active: false, near: 0, cols, rows };
    // Glitch band state (re-rolled while the line moves).
    let lastLine = -1;
    let strips: { src: number; off: number }[] = [];

    const resize = () => {
      const r = wrap.getBoundingClientRect();
      cell = Math.max(1, Math.floor(Math.min(r.width / cols, r.height ? r.height / rows : Infinity)));
      w = cell * cols;
      h = cell * rows;
      cv.style.width = `${w}px`;
      cv.style.height = `${h}px`;
      cv.width = w;
      cv.height = h;
      comp.width = w;
      comp.height = h;
      for (const st of states.current) {
        st.layer.width = w;
        st.layer.height = h;
      }
      if (grid) cv.style.backgroundSize = `${cell}px ${cell}px`;
      force = true;
    };

    const onMove = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      env.px = ((e.clientX - r.left) / r.width) * cols;
      env.py = ((e.clientY - r.top) / r.height) * rows;
      env.active = true;
    };
    const onLeave = () => {
      env.active = false;
    };

    const isSettled = (st: ArtState) => !st.assembled || reduced || clock.current - st.assembleAt > st.settleAfter;

    const renderArt = (st: ArtState, target: CanvasRenderingContext2D, dt: number) => {
      const { def } = st;
      if (!st.assembled) return;
      const since = clock.current - st.assembleAt;
      const settled = reduced || since > st.settleAfter;
      const k = 1 - Math.exp(-dt * 7);
      let moving = false;
      const fx = def.layers.map((l, li) => {
        const f = layerFx(def.id, l.name, env);
        const o = st.offsets[li];
        const tdx = f.dx ?? 0;
        const tdy = f.dy ?? 0;
        o.dx += (tdx - o.dx) * (reduced ? 1 : k);
        o.dy += (tdy - o.dy) * (reduced ? 1 : k);
        if (Math.abs(tdx - o.dx) > 0.002 || Math.abs(tdy - o.dy) > 0.002) moving = true;
        return f;
      });
      st.moving = moving;
      for (const p of st.particles) {
        if (since < p.delay && !reduced) continue;
        const f = fx[p.layer];
        const o = st.offsets[p.layer];
        const tx = p.hx + o.dx;
        const ty = p.hy + o.dy;

        if (settled) {
          // Whole layers move together: identical offsets keep the lattice intact.
          p.x = tx;
          p.y = ty;
        } else {
          p.vx += ((tx - p.x) * STIFFNESS - p.vx * DAMPING) * dt;
          p.vy += ((ty - p.y) * STIFFNESS - p.vy * DAMPING) * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
        }
        const goal = (f.alpha ?? 1) * (f.alphaAt ? f.alphaAt(p.hx, p.hy) : 1);
        p.alpha += (goal - p.alpha) * Math.min(1, dt * 9);
        if (Math.abs(goal - p.alpha) > 0.01) st.moving = true;
        if (p.alpha < 0.02) continue;

        target.globalAlpha = p.alpha;
        target.fillStyle = f.recolor?.[p.ch] ?? def.palette[p.ch];
        // Snap to whole pixels so neighbouring cells tile without seams.
        const x0 = Math.round(p.x * cell);
        const y0 = Math.round(p.y * cell);
        target.fillRect(x0, y0, Math.round((p.x + 1) * cell) - x0, Math.round((p.y + 1) * cell) - y0);
      }
      target.globalAlpha = 1;
    };

    const tick = (_: number, deltaMs: number) => {
      if (!visible || !w) return;
      const dt = Math.min(deltaMs, 40) / 1000;
      clock.current += dt;
      env.t = clock.current;
      env.near += ((env.active ? 1 : 0) - env.near) * Math.min(1, dt * 4);

      const sc: Scene = scene ? scene() : { a: 0 };
      const A = states.current[sc.a];
      const B = sc.b !== undefined ? states.current[sc.b] : undefined;
      const line = sc.line;

      // Skip the frame entirely when nothing on this canvas can have changed.
      const key = `${sc.a}|${sc.b ?? ""}|${line === undefined ? "" : Math.round(line)}`;
      const busy =
        force ||
        key !== lastKey ||
        env.active ||
        env.near > 0.002 ||
        (A && (!isSettled(A) || A.moving || ALWAYS_ANIMATED.has(A.def.id))) ||
        (B && (!isSettled(B) || B.moving || ALWAYS_ANIMATED.has(B.def.id)));
      if (!busy) return;
      force = false;
      lastKey = key;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, w, h);
      if (grid && env.active && env.px >= 0 && env.py >= 0 && env.px < cols && env.py < rows) {
        ctx.fillStyle = "rgba(232,83,19,0.12)";
        ctx.fillRect(Math.floor(env.px) * cell, Math.floor(env.py) * cell, cell, cell);
      }

      // No transition in progress: draw the current art straight onto the canvas.
      if (!B || line === undefined || line <= 0 || line >= h) {
        const st = B && line !== undefined && line <= 0 ? B : A;
        if (st) renderArt(st, ctx, dt);
        return;
      }

      // Transition: art A above the line, art B below it…
      for (const st of [A, B]) {
        if (!st) continue;
        st.lctx.setTransform(1, 0, 0, 1, 0, 0);
        st.lctx.clearRect(0, 0, w, h);
        renderArt(st, st.lctx, dt);
      }
      const L = Math.round(line);
      cctx.setTransform(1, 0, 0, 1, 0, 0);
      cctx.clearRect(0, 0, w, h);
      if (A && L > 0) cctx.drawImage(A.layer, 0, 0, w, L, 0, 0, w, L);
      if (L < h) cctx.drawImage(B.layer, 0, L, w, h - L, 0, L, w, h - L);

      // …and a band of sliced, sideways-shifted scan lines where they meet.
      const band = cell * 2.4;
      const stripH = Math.max(2, Math.round(cell / 3));
      const count = Math.ceil((band * 2) / stripH);
      if (Math.abs(line - lastLine) > 0.5 || strips.length !== count) {
        lastLine = line;
        strips = Array.from({ length: count }, (_, i) => {
          const y = L - band + i * stripH;
          const k = 1 - Math.abs(y - L) / band; // 1 at the line, 0 at the edges
          const towardsB = (y - (L - band)) / (band * 2);
          return {
            src: Math.random() < towardsB ? 1 : 0,
            off: Math.random() < 0.8 ? Math.round((Math.random() - 0.5) * 2 * cell * 3 * k) : 0,
          };
        });
      }
      strips.forEach((s, i) => {
        if (!s.off) return;
        const y = Math.round(L - band + i * stripH);
        if (y + stripH <= 0 || y >= h) return;
        const src = s.src ? B.layer : A?.layer;
        if (!src) return;
        const y0 = Math.max(0, y);
        const hh = Math.min(h, y + stripH) - y0;
        cctx.clearRect(0, y0, w, hh);
        cctx.drawImage(src, 0, y0, w, hh, s.off, y0, w, hh);
      });
      ctx.drawImage(comp, 0, 0);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        force = true;
      },
      { rootMargin: "120px" },
    );
    io.observe(wrap);
    hostEl.addEventListener("pointermove", onMove);
    hostEl.addEventListener("pointerleave", onLeave);
    gsap.ticker.add(tick);

    return () => {
      gsap.ticker.remove(tick);
      ro.disconnect();
      io.disconnect();
      hostEl.removeEventListener("pointermove", onMove);
      hostEl.removeEventListener("pointerleave", onLeave);
    };
  }, [arts, host, grid, scene, scattered]);

  return (
    <div ref={box} className={className} style={{ display: "grid", placeItems: "center" }}>
      <canvas
        ref={canvas}
        role="img"
        aria-label={label}
        style={{
          imageRendering: "pixelated",
          ...(grid
            ? {
                backgroundImage:
                  "linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px)",
                boxShadow: "inset -1px -1px 0 rgba(0,0,0,0.05)",
              }
            : {}),
        }}
      />
    </div>
  );
}
