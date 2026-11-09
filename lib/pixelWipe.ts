"use client";

/**
 * Full-screen pixel wipes on a canvas, used by the loader and the page
 * transitions:
 *  - cover:    orange square pixels grow outward from a point until the
 *              screen is solid orange
 *  - dissolve: the solid orange breaks into pixels that shrink away from a
 *              point outwards, revealing the page underneath
 * Drawn at 1 canvas pixel per CSS pixel (CSS scales it up crisply with
 * image-rendering: pixelated).
 */

export const WIPE_COLOR = "#e85313";

type Opts = {
  /** Where the effect starts, in viewport px (defaults to the centre). */
  originX?: number;
  originY?: number;
  /** Seconds for the wave to travel from the origin to the far edge. */
  spread?: number;
  /** Seconds each pixel takes to grow/shrink. */
  pop?: number;
};

function setup(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d")!;
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = Math.ceil(w);
  canvas.height = Math.ceil(h);
  const cell = Math.round(Math.min(48, Math.max(28, w / 40)));
  return { ctx, w, h, cell, cols: Math.ceil(w / cell), rows: Math.ceil(h / cell) };
}

function run(canvas: HTMLCanvasElement, mode: "cover" | "dissolve", opts: Opts) {
  const { ctx, w, h, cell, cols, rows } = setup(canvas);
  const spread = opts.spread ?? (mode === "cover" ? 0.5 : 0.95);
  const pop = opts.pop ?? (mode === "cover" ? 0.22 : 0.32);
  const ox = opts.originX ?? w / 2;
  const oy = opts.originY ?? h * 0.55;
  const maxD = Math.hypot(Math.max(ox, w - ox), Math.max(oy, h - oy));
  const delays = new Float32Array(cols * rows);
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const d = Math.hypot(i * cell + cell / 2 - ox, j * cell + cell / 2 - oy) / maxD;
      delays[j * cols + i] = (d * 0.75 + Math.random() * 0.25) * spread;
    }
  }
  const ease = (t: number) => t * t * t;
  const total = spread + pop;

  return new Promise<void>((resolve) => {
    const start = performance.now();
    const frame = (now: number) => {
      const t = (now - start) / 1000;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = WIPE_COLOR;
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const p = Math.min(1, Math.max(0, (t - delays[j * cols + i]) / pop));
          // cover: 0 → full size; dissolve: full size → 0
          const k = mode === "cover" ? 1 - ease(1 - p) : 1 - ease(p);
          if (k <= 0) continue;
          // Full cells overlap by a pixel so solid areas stay seamless.
          const s = k >= 1 ? cell + 1 : Math.max(1, Math.round(cell * k));
          ctx.fillRect(Math.round(i * cell + (cell - s) / 2), Math.round(j * cell + (cell - s) / 2), s, s);
        }
      }
      if (t < total) requestAnimationFrame(frame);
      else {
        if (mode === "cover") {
          ctx.fillRect(0, 0, w, h);
        } else ctx.clearRect(0, 0, w, h);
        resolve();
      }
    };
    // Paint the first frame straight away so hand-overs never flash.
    frame(start);
  });
}

export const pixelCover = (canvas: HTMLCanvasElement, opts: Opts = {}) => run(canvas, "cover", opts);
export const pixelDissolve = (canvas: HTMLCanvasElement, opts: Opts = {}) => run(canvas, "dissolve", opts);

/** Resolves once the page's fonts and images are in (capped so it never hangs). */
export function whenLoaded(cap = 6000) {
  const page =
    document.readyState === "complete"
      ? Promise.resolve()
      : new Promise<void>((res) => window.addEventListener("load", () => res(), { once: true }));
  const fonts = document.fonts?.ready.then(() => undefined) ?? Promise.resolve();
  const limit = new Promise<void>((res) => setTimeout(res, cap));
  return Promise.race([Promise.all([page, fonts]).then(() => undefined), limit]);
}
