"use client";

import { useEffect, useImperativeHandle, useRef, type Ref, type RefObject } from "react";
import { gsap, prefersReducedMotion } from "@/lib/gsap";
import type { PixelArtData } from "./pixelArt.data";

export type PixelBehavior = "ghost" | "cherry" | "potion" | "heart";
export type PixelArtHandle = { assemble: () => void };

type Props = {
  art: PixelArtData;
  behavior: PixelBehavior;
  /** Element whose pointer movement drives the interaction (usually the card). */
  host: RefObject<HTMLElement | null>;
  className?: string;
  label: string;
  ref?: Ref<PixelArtHandle>;
};

const GRID = 32;
const REPEL_RADIUS = 2.8; // in cells
const REPEL_FORCE = 2.4; // in cells
const STIFFNESS = 140;
const DAMPING = 15;

type Particle = {
  hx: number; // home (cells)
  hy: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  delay: number;
  kind: "body" | "pupil" | "bubble";
  /** pupil: index inside its 2×2 block / eye; bubble: phase */
  a: number;
  b: number;
};

// Every 2×2 position a pupil may occupy inside the ghost's left eye whites.
const PUPIL_SPOTS = [
  [11, 10],
  [10, 11],
  [11, 11],
  [12, 11],
  [10, 12],
  [11, 12],
  [12, 12],
  [11, 13],
];

function buildParticles(art: PixelArtData, behavior: PixelBehavior) {
  const out: Particle[] = [];
  art.rows.forEach((row, r) => {
    [...row].forEach((ch, c) => {
      if (ch === ".") return;
      const color = art.palette[ch];
      const base: Particle = {
        hx: c,
        hy: r,
        x: c,
        y: r,
        vx: 0,
        vy: 0,
        color,
        alpha: 0,
        delay: 0,
        kind: "body",
        a: 0,
        b: 0,
      };
      if (behavior === "ghost" && color === "#090c64") {
        // Leave white behind the pupil so it can look around.
        out.push({ ...base, color: "#ffffff" });
        const eye = c >= 16 ? 1 : 0;
        const local = c - (eye ? 20 : 12) + (r - 11) * 2; // 0..3 within the 2×2 block
        out.push({ ...base, kind: "pupil", a: local, b: eye });
        return;
      }
      if (behavior === "potion" && r < 9) {
        out.push({ ...base, kind: "bubble", a: Math.random(), b: 0.6 + Math.random() * 0.6 });
        return;
      }
      out.push(base);
    });
  });
  // Pupils are drawn last so they sit on top of the eye whites.
  return out.sort((p, q) => Number(p.kind === "pupil") - Number(q.kind === "pupil"));
}

/** Two quick thumps then a rest – a heartbeat curve in 0..1. */
function beat(t: number) {
  const p = t % 1;
  const pulse = (center: number, width: number) => Math.max(0, 1 - Math.abs(p - center) / width);
  return Math.pow(pulse(0.1, 0.1), 2) + 0.6 * Math.pow(pulse(0.32, 0.1), 2);
}

/**
 * Canvas pixel art where every pixel is a spring-loaded particle:
 * pixels scatter away from the cursor and spring back home, and each
 * illustration has its own personality (ghost eyes follow you, cherries
 * sway, the potion bubbles, the heart beats faster when you're near).
 */
export default function PixelArt({ art, behavior, host, className, label, ref }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const state = useRef({ assembled: false, assembleAt: 0, time: 0 });

  useImperativeHandle(ref, () => ({
    assemble() {
      if (state.current.assembled) return;
      state.current.assembled = true;
      state.current.assembleAt = state.current.time;
    },
  }));

  useEffect(() => {
    const cv = canvas.current!;
    const ctx = cv.getContext("2d")!;
    const hostEl = host.current ?? cv.parentElement!;
    const reduced = prefersReducedMotion();
    const particles = buildParticles(art, behavior);
    const st = state.current;
    let dpr = 1;
    let px = 0; // css px
    let cell = 0;
    let visible = false;
    const pointer = { x: -99, y: -99, active: false, near: 0 };

    // Scatter everything for the assemble intro.
    const cx = GRID / 2;
    for (const p of particles) {
      const ang = Math.random() * Math.PI * 2;
      const dist = 10 + Math.random() * 14;
      p.x = p.hx + Math.cos(ang) * dist;
      p.y = p.hy + Math.sin(ang) * dist;
      p.delay = Math.random() * 0.35 + Math.hypot(p.hx - cx, p.hy - cx) * 0.025;
      if (reduced) {
        p.x = p.hx;
        p.y = p.hy;
        p.alpha = 1;
      }
    }
    if (reduced) st.assembled = true;

    const resize = () => {
      const r = cv.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      px = r.width;
      cell = px / GRID;
      cv.width = Math.round(px * dpr);
      cv.height = Math.round(px * dpr);
    };

    const onMove = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      pointer.x = ((e.clientX - r.left) / r.width) * GRID;
      pointer.y = ((e.clientY - r.top) / r.height) * GRID;
      pointer.active = true;
    };
    const onLeave = () => {
      pointer.active = false;
    };

    const pupilSpot = (eye: number, t: number) => {
      // Where should the ghost look? At the cursor, or idly around the room.
      const ex = eye ? 20 : 12;
      const ey = 12.5;
      let dx: number;
      let dy: number;
      if (pointer.active) {
        dx = pointer.x - ex;
        dy = pointer.y - ey;
      } else {
        dx = Math.sin(t * 0.7) * 6;
        dy = Math.sin(t * 1.1 + 1) * 3;
      }
      const len = Math.hypot(dx, dy) || 1;
      const want = [11 + (dx / len) * 1.2, 11.5 + (dy / len) * 1.4];
      let best = PUPIL_SPOTS[0];
      let bestD = Infinity;
      for (const s of PUPIL_SPOTS) {
        const d = (s[0] - want[0]) ** 2 + (s[1] - want[1]) ** 2;
        if (d < bestD) {
          bestD = d;
          best = s;
        }
      }
      return [best[0] + (eye ? 8 : 0), best[1]];
    };

    const tick = (_: number, deltaMs: number) => {
      if (!visible) return;
      const dt = Math.min(deltaMs, 40) / 1000;
      st.time += dt;
      const t = st.time;

      pointer.near += ((pointer.active ? 1 : 0) - pointer.near) * Math.min(1, dt * 4);

      // Per-illustration transform of the home positions.
      let angle = 0;
      let pivotX = 16;
      let pivotY = 16;
      let scale = 1;
      let floatY = 0;
      if (behavior === "ghost") floatY = Math.sin(t * 2.2) * 0.45;
      if (behavior === "cherry") {
        pivotX = 27;
        pivotY = 4;
        const lean = pointer.active ? (pointer.x - 16) / 16 : 0;
        angle = Math.sin(t * 1.6) * 0.045 + lean * 0.09 * pointer.near;
      }
      if (behavior === "potion") {
        pivotX = 16;
        pivotY = 27;
        angle = Math.sin(t * 1.3) * 0.03 + (pointer.active ? ((pointer.x - 16) / 16) * 0.06 * pointer.near : 0);
      }
      if (behavior === "heart") {
        const rate = 1.05 + pointer.near * 1.15;
        if (st.assembled) scale = 1 + beat(t * rate) * (0.07 + pointer.near * 0.05);
      }
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      const pupils = behavior === "ghost" ? [pupilSpot(0, t), pupilSpot(1, t)] : null;
      const since = t - st.assembleAt;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, px, px);

      // Grid
      ctx.fillStyle = "rgba(0,0,0,0.05)";
      for (let i = 0; i <= GRID; i++) {
        const v = Math.min(Math.round(i * cell), Math.round(px) - 1);
        ctx.fillRect(v, 0, 1, px);
        ctx.fillRect(0, v, px, 1);
      }
      // Hovered cell
      if (pointer.active && pointer.x >= 0 && pointer.y >= 0 && pointer.x < GRID && pointer.y < GRID) {
        ctx.fillStyle = "rgba(232,83,19,0.12)";
        ctx.fillRect(Math.floor(pointer.x) * cell, Math.floor(pointer.y) * cell, cell, cell);
      }

      if (!st.assembled) return;

      for (const p of particles) {
        if (since < p.delay && !reduced) continue;

        let hx = p.hx;
        let hy = p.hy;
        if (p.kind === "pupil" && pupils) {
          const spot = pupils[p.b];
          hx = spot[0] + (p.a % 2);
          hy = spot[1] + Math.floor(p.a / 2);
        }
        let alphaTarget = 1;
        if (p.kind === "bubble") {
          const speed = 0.35 + pointer.near * 0.6;
          const phase = (p.a + t * speed * p.b) % 1;
          hy = p.hy - phase * 4 + 2;
          hx = p.hx + Math.sin((phase + p.a) * Math.PI * 2) * 0.6;
          alphaTarget = Math.sin(phase * Math.PI);
        }

        // Rotate / scale around the pivot, then float.
        const rx = (hx + 0.5 - pivotX) * scale;
        const ry = (hy + 0.5 - pivotY) * scale;
        let tx = pivotX + rx * cos - ry * sin - 0.5;
        let ty = pivotY + rx * sin + ry * cos - 0.5 + floatY;

        // Cursor repel
        if (pointer.active && !reduced) {
          const dx = p.x + 0.5 - pointer.x;
          const dy = p.y + 0.5 - pointer.y;
          const d = Math.hypot(dx, dy);
          if (d < REPEL_RADIUS && d > 0.001) {
            const f = Math.pow(1 - d / REPEL_RADIUS, 2) * REPEL_FORCE;
            tx += (dx / d) * f;
            ty += (dy / d) * f;
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
        p.alpha += (alphaTarget - p.alpha) * Math.min(1, dt * (p.kind === "bubble" ? 8 : 5));

        if (p.alpha < 0.01) continue;
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        // Snap to whole pixels so neighbouring cells tile without seams.
        const x0 = Math.round(p.x * cell);
        const y0 = Math.round(p.y * cell);
        ctx.fillRect(x0, y0, Math.round((p.x + 1) * cell) - x0, Math.round((p.y + 1) * cell) - y0);
      }
      ctx.globalAlpha = 1;
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(cv);
    const io = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting), {
      rootMargin: "100px",
    });
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
  }, [art, behavior, host]);

  return <canvas ref={canvas} className={className} role="img" aria-label={label} />;
}
