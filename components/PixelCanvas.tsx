"use client";

import { useEffect, useImperativeHandle, useRef, type Ref, type RefObject } from "react";
import { gsap, prefersReducedMotion } from "@/lib/gsap";
import type { PixelArtDef } from "./pixelArt.data";

/**
 * Canvas pixel-art renderer shared by the service stack, the getting-started
 * cards and the CTA.
 *
 *  - every pixel is a spring-loaded particle: pixels scatter away from the
 *    cursor and spring back, and fly in to form the art on `assemble()`
 *  - each named layer has its own little animation (see `layerFx`)
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

const REPEL_RADIUS = 2.6;
const REPEL_FORCE = 2.2;
const STIFFNESS = 140;
const DAMPING = 15;

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
};

type Fx = {
  dx?: number;
  dy?: number;
  angle?: number;
  pivotX?: number;
  pivotY?: number;
  scale?: number;
  alpha?: number;
  /** per-cell alpha multiplier */
  alphaAt?: (hx: number, hy: number) => number;
  recolor?: Record<string, string>;
};

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const pulse = (t: number) => 0.5 + 0.5 * Math.sin(t);

/** Per-layer personality. Layer names come from scripts/gen-pixel-art.py. */
function layerFx(art: string, layer: string, e: Env): Fx {
  const lean = e.active ? clamp((e.px - 16) / 16, -1, 1) * e.near : 0;
  switch (art) {
    case "nib":
      if (layer === "nib" || layer === "collar")
        return { angle: Math.sin(e.t * 1.3) * 0.035 + lean * 0.14, pivotX: 16.5, pivotY: 3, dy: Math.sin(e.t * 2) * 0.3 };
      if (layer === "spark") return { alpha: 0.35 + 0.65 * pulse(e.t * 3.2) };
      if (layer === "spark2") return { alpha: 0.35 + 0.65 * pulse(e.t * 3.2 + 2) };
      return {};
    case "browser": {
      if (layer === "cursor") {
        // The little cursor follows yours inside the window.
        const tx = e.active ? clamp(e.px - 21, -16, 5) : Math.sin(e.t * 0.9) * 2.5;
        const ty = e.active ? clamp(e.py - 20, -11, 3) : Math.sin(e.t * 1.4) * 1.5;
        return { dx: tx * e.near + (1 - e.near) * Math.sin(e.t * 0.9) * 2.5, dy: ty * e.near + (1 - e.near) * Math.sin(e.t * 1.4) * 1.5 };
      }
      if (layer === "button") {
        const cx = e.active ? 21 + clamp(e.px - 21, -16, 5) * e.near : 21;
        const cy = e.active ? 20 + clamp(e.py - 20, -11, 3) * e.near : 20;
        const over = cx >= 17 && cx <= 26 && cy >= 18 && cy <= 22;
        return over ? { recolor: { o: "#c94100" }, dy: 0.15 } : {};
      }
      if (layer === "spark") return { alpha: 0.35 + 0.65 * pulse(e.t * 3) };
      return { dy: Math.sin(e.t * 1.6) * 0.15 };
    }
    case "blocks": {
      const i = Number(layer.slice(-1));
      const ox = i % 2 ? 1 : -1;
      const oy = i > 1 ? 1 : -1;
      const spread = e.near * 1.4;
      return { dx: ox * spread, dy: oy * spread + Math.sin(e.t * 2.4 + i * 1.1) * 0.45 };
    }
    case "megaphone": {
      if (layer === "horn")
        return { angle: Math.sin(e.t * 18) * 0.012 * e.near + Math.sin(e.t * 1.2) * 0.03, pivotX: 9, pivotY: 16 };
      const i = Number(layer.slice(-1));
      const speed = 0.7 + e.near * 1.3;
      const ph = (e.t * speed - i * 0.28 + 3) % 1;
      return { alpha: clamp(Math.sin(ph * Math.PI) * 1.4, 0, 1), dx: ph * 1.2 };
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
      if (layer === "doc") return { dy: Math.sin(e.t * 1.6) * 0.25 - e.near * 0.4, angle: e.near * 0.04, pivotX: 14, pivotY: 18 };
      if (layer === "rays") return { alpha: 0.4 + 0.6 * pulse(e.t * 4) };
      if (layer === "spark") return { alpha: 0.35 + 0.65 * pulse(e.t * 3) };
      return {};
    }
    case "rocket": {
      const lift = -e.near * 1.6 + Math.sin(e.t * 2.2) * 0.3;
      const shake = e.near * Math.sin(e.t * 40) * 0.12;
      if (layer === "rocket") return { dy: lift, dx: shake };
      if (layer === "flame1") return { dy: lift, dx: shake, alpha: Math.sin(e.t * 22) > 0 ? 1 : 0 };
      if (layer === "flame2") return { dy: lift, dx: shake, alpha: Math.sin(e.t * 22) > 0 ? 0 : 1, scale: 1 + e.near * 0.15, pivotX: 12.5, pivotY: 13 };
      if (layer === "clouds") return { scale: 1 + e.near * 0.05 + Math.sin(e.t * 2.4) * 0.01, pivotX: 13, pivotY: 19 };
      if (layer === "spark") return { alpha: 0.35 + 0.65 * pulse(e.t * 3) };
      return {};
    }
    case "idea": {
      const bob = (ph: number) => Math.sin(e.t * 1.7 + ph) * 0.3;
      const glow = e.active ? clamp(1.25 - Math.hypot(e.px - 7.5, e.py - 7) / 12, 0.3, 1) : 0.55;
      if (layer === "rays") return { alpha: glow * (0.55 + 0.45 * pulse(e.t * 5)), scale: 1 + glow * 0.08, pivotX: 7.5, pivotY: 7 };
      if (layer === "bulb") return { dy: bob(0), recolor: glow > 0.8 ? { y: "#ffe45c" } : undefined };
      if (layer === "arrow1" || layer === "arrow2")
        return { alphaAt: (hx) => 0.25 + 0.75 * (Math.floor(hx - e.t * 6) % 3 === 0 ? 1 : 0.35) };
      if (layer === "win1") return { dy: bob(1.2), dx: lean * 0.4 };
      if (layer === "win2") return { dy: bob(2.4), dx: lean * 0.6 };
      if (layer === "click") return { dy: bob(2.4) + (Math.sin(e.t * 4) > 0.7 ? 0.35 : 0), dx: lean * 0.6 };
      if (layer === "cursor") {
        // Your cursor in the picture follows the real one.
        if (!e.active) return { dx: Math.sin(e.t * 0.8) * 1.2, dy: Math.sin(e.t * 1.3) * 0.8 };
        return { dx: clamp(e.px - 7, -7, 33) * e.near, dy: clamp(e.py - 16, -15, 4) * e.near };
      }
      if (layer === "spark") return { alpha: 0.35 + 0.65 * pulse(e.t * 3) };
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
          const ang = Math.random() * Math.PI * 2;
          const dist = def.cols * (0.3 + Math.random() * 0.45);
          p.x = c + Math.cos(ang) * dist;
          p.y = r + Math.sin(ang) * dist;
          p.alpha = 0;
          p.delay = Math.random() * 0.35 + Math.hypot(c - cx, r - cy) * 0.022;
        }
        out.push(p);
      }
    });
  });
  return out;
}

export default function PixelCanvas({ arts, host, label, className, grid, scene, scattered, ref }: Props) {
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
    const cv = canvas.current!;
    const ctx = cv.getContext("2d")!;
    const hostEl = host.current ?? cv.parentElement!;
    const reduced = prefersReducedMotion();
    const cols = arts[0].cols;
    const rows = arts[0].rows;

    states.current = arts.map((def, i) => {
      const isScattered = scattered ? scattered(i) : true;
      const layer = document.createElement("canvas");
      return {
        def,
        particles: build(def, isScattered, reduced),
        assembled: !isScattered || reduced,
        assembleAt: -10,
        layer,
        lctx: layer.getContext("2d")!,
      };
    });

    // Arts are composited here first, so the glitch band never erases the grid.
    const comp = document.createElement("canvas");
    const cctx = comp.getContext("2d")!;
    let dpr = 1;
    let w = 0;
    let h = 0;
    let cell = 0;
    let visible = false;
    const env: Env = { t: 0, px: -99, py: -99, active: false, near: 0 };
    // Glitch band state (re-rolled while the line moves).
    let lastLine = -1;
    let strips: { src: number; off: number }[] = [];

    const resize = () => {
      const r = cv.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width;
      h = r.height;
      cell = w / cols;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      comp.width = cv.width;
      comp.height = cv.height;
      for (const st of states.current) {
        st.layer.width = cv.width;
        st.layer.height = cv.height;
      }
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

    const renderArt = (st: ArtState, dt: number) => {
      const { lctx, def } = st;
      lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      lctx.clearRect(0, 0, w, h);
      if (!st.assembled) return;
      const since = clock.current - st.assembleAt;
      const fx = def.layers.map((l) => layerFx(def.id, l.name, env));
      for (const p of st.particles) {
        if (since < p.delay && !reduced) continue;
        const f = fx[p.layer];
        const scale = f.scale ?? 1;
        const angle = f.angle ?? 0;
        const pvx = f.pivotX ?? cols / 2;
        const pvy = f.pivotY ?? rows / 2;
        const rx = (p.hx + 0.5 - pvx) * scale;
        const ry = (p.hy + 0.5 - pvy) * scale;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        let tx = pvx + rx * cos - ry * sin - 0.5 + (f.dx ?? 0);
        let ty = pvy + rx * sin + ry * cos - 0.5 + (f.dy ?? 0);

        if (env.active && !reduced) {
          const dx = p.x + 0.5 - env.px;
          const dy = p.y + 0.5 - env.py;
          const d = Math.hypot(dx, dy);
          if (d < REPEL_RADIUS && d > 0.001) {
            const force = Math.pow(1 - d / REPEL_RADIUS, 2) * REPEL_FORCE;
            tx += (dx / d) * force;
            ty += (dy / d) * force;
          }
        }

        if (reduced) {
          p.x = tx;
          p.y = ty;
        } else {
          p.vx += ((tx - p.x) * STIFFNESS - p.vx * DAMPING) * dt;
          p.vy += ((ty - p.y) * STIFFNESS - p.vy * DAMPING) * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
        }
        const target = (f.alpha ?? 1) * (f.alphaAt ? f.alphaAt(p.hx, p.hy) : 1);
        p.alpha += (target - p.alpha) * Math.min(1, dt * 9);
        if (p.alpha < 0.02) continue;

        lctx.globalAlpha = p.alpha;
        lctx.fillStyle = f.recolor?.[p.ch] ?? def.palette[p.ch];
        // Snap to whole pixels so neighbouring cells tile without seams.
        const x0 = Math.round(p.x * cell);
        const y0 = Math.round(p.y * cell);
        lctx.fillRect(x0, y0, Math.round((p.x + 1) * cell) - x0, Math.round((p.y + 1) * cell) - y0);
      }
      lctx.globalAlpha = 1;
    };

    const tick = (_: number, deltaMs: number) => {
      if (!visible) return;
      const dt = Math.min(deltaMs, 40) / 1000;
      clock.current += dt;
      env.t = clock.current;
      env.near += ((env.active ? 1 : 0) - env.near) * Math.min(1, dt * 4);

      const sc: Scene = scene ? scene() : { a: 0 };
      const A = states.current[sc.a];
      const B = sc.b !== undefined ? states.current[sc.b] : undefined;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      if (grid) {
        ctx.fillStyle = "rgba(0,0,0,0.05)";
        for (let i = 0; i <= cols; i++) {
          const v = Math.min(Math.round(i * cell), Math.round(w) - 1);
          ctx.fillRect(v, 0, 1, h);
        }
        for (let j = 0; j <= rows; j++) {
          const v = Math.min(Math.round(j * cell), Math.round(h) - 1);
          ctx.fillRect(0, v, w, 1);
        }
        if (env.active && env.px >= 0 && env.py >= 0 && env.px < cols && env.py < rows) {
          ctx.fillStyle = "rgba(232,83,19,0.12)";
          ctx.fillRect(Math.floor(env.px) * cell, Math.floor(env.py) * cell, cell, cell);
        }
      }

      if (A) renderArt(A, dt);
      if (B) renderArt(B, dt);

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const line = sc.line;
      if (!B || line === undefined || line <= 0) {
        // Whole of the incoming art once the line has passed the top.
        const st = B && line !== undefined && line <= 0 ? B : A;
        if (st) ctx.drawImage(st.layer, 0, 0);
        return;
      }
      if (line >= h) {
        if (A) ctx.drawImage(A.layer, 0, 0);
        return;
      }

      // Art A above the line, art B below it…
      const L = Math.round(line * dpr);
      const W = cv.width;
      const H = cv.height;
      cctx.setTransform(1, 0, 0, 1, 0, 0);
      cctx.clearRect(0, 0, W, H);
      if (A && L > 0) cctx.drawImage(A.layer, 0, 0, W, L, 0, 0, W, L);
      if (L < H) cctx.drawImage(B.layer, 0, L, W, H - L, 0, L, W, H - L);

      // …and a band of sliced, sideways-shifted scan lines where they meet.
      const band = cell * 2.4 * dpr;
      const stripH = Math.max(2, Math.round((cell / 3) * dpr));
      const count = Math.ceil((band * 2) / stripH);
      if (Math.abs(line - lastLine) > 0.5 || strips.length !== count) {
        lastLine = line;
        strips = Array.from({ length: count }, (_, i) => {
          const y = L - band + i * stripH;
          const k = 1 - Math.abs(y - L) / band; // 1 at the line, 0 at the edges
          const towardsB = (y - (L - band)) / (band * 2);
          return {
            src: Math.random() < towardsB ? 1 : 0,
            off: Math.random() < 0.8 ? Math.round((Math.random() - 0.5) * 2 * cell * 3 * dpr * k) : 0,
          };
        });
      }
      strips.forEach((s, i) => {
        if (!s.off) return;
        const y = Math.round(L - band + i * stripH);
        if (y + stripH <= 0 || y >= H) return;
        const src = s.src ? B.layer : A?.layer;
        if (!src) return;
        const y0 = Math.max(0, y);
        const hh = Math.min(H, y + stripH) - y0;
        cctx.clearRect(0, y0, W, hh);
        cctx.drawImage(src, 0, y0, W, hh, s.off, y0, W, hh);
      });
      ctx.drawImage(comp, 0, 0);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(cv);
    const io = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting), { rootMargin: "120px" });
    io.observe(cv);
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

  return <canvas ref={canvas} className={className} role="img" aria-label={label} />;
}
