"use client";

import { useRef, useState } from "react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import styles from "./Loader.module.css";

type Props = {
  /** Fired when the orange starts breaking apart – the page begins its intro. */
  onReveal: () => void;
};

const ORANGE = "#e85313";
/** Seconds over which the dissolve sweeps from the centre to the edges. */
const SPREAD = 0.95;
/** Seconds each pixel takes to shrink away. */
const SHRINK = 0.32;

function whenLoaded() {
  const page =
    document.readyState === "complete"
      ? Promise.resolve()
      : new Promise<void>((res) => window.addEventListener("load", () => res(), { once: true }));
  const fonts = document.fonts?.ready.then(() => undefined) ?? Promise.resolve();
  // Never hold the visitor hostage: cap the wait.
  const cap = new Promise<void>((res) => setTimeout(res, 6000));
  return Promise.race([Promise.all([page, fonts]).then(() => undefined), cap]);
}

/**
 * The orange screen breaks into square pixels that shrink away, starting at
 * the centre and rippling out to the edges (with a little randomness), so
 * the website shows through pixel by pixel.
 */
function dissolve(canvas: HTMLCanvasElement, onDone: () => void) {
  const ctx = canvas.getContext("2d")!;
  const w = window.innerWidth;
  const h = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.ceil(w * dpr);
  canvas.height = Math.ceil(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const cell = Math.round(Math.min(48, Math.max(28, w / 40)));
  const cols = Math.ceil(w / cell);
  const rows = Math.ceil(h / cell);
  const cx = w / 2;
  const cy = h * 0.55; // just below centre, where the hero art sits
  const maxD = Math.hypot(Math.max(cx, w - cx), Math.max(cy, h - cy));
  const delays = new Float32Array(cols * rows);
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const d = Math.hypot(i * cell + cell / 2 - cx, j * cell + cell / 2 - cy) / maxD;
      delays[j * cols + i] = (d * 0.75 + Math.random() * 0.25) * SPREAD;
    }
  }

  const easeIn = (t: number) => t * t * t;
  const start = performance.now();
  const total = SPREAD + SHRINK;

  const frame = (now: number) => {
    const t = (now - start) / 1000;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = ORANGE;
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const p = Math.min(1, Math.max(0, (t - delays[j * cols + i]) / SHRINK));
        if (p >= 1) continue;
        // Full cells overlap by a pixel so the orange stays seamless.
        const s = p <= 0 ? cell + 1 : Math.max(1, Math.round(cell * (1 - easeIn(p))));
        const x = Math.round(i * cell + (cell - s) / 2);
        const y = Math.round(j * cell + (cell - s) / 2);
        ctx.fillRect(x, y, s, s);
      }
    }
    if (t < total) requestAnimationFrame(frame);
    else onDone();
  };
  // Paint the first (fully orange) frame right away so the hand-over from the
  // CSS background to the canvas never shows a blank frame.
  frame(start);
}

export default function Loader({ onReveal }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [done, setDone] = useState(false);

  useGSAP(
    () => {
      const el = root.current!;
      const count = el.querySelector<HTMLElement>(`.${styles.count}`)!;
      const fill = el.querySelector<HTMLElement>(`.${styles.fill}`)!;
      let alive = true;
      const progress = { v: 0 };
      const render = () => {
        const v = Math.round(progress.v);
        count.textContent = String(v);
        gsap.set(fill, { scaleX: progress.v / 100 });
      };

      if (prefersReducedMotion()) {
        whenLoaded().then(() => {
          if (!alive) return;
          onReveal();
          setDone(true);
        });
        return () => {
          alive = false;
        };
      }

      gsap.from(`.${styles.center}`, { autoAlpha: 0, y: 24, duration: 0.9, ease: "power3.out" });

      // Ease towards 86% while assets load, then finish once everything is in.
      const crawl = gsap.to(progress, {
        v: 86,
        duration: 2.2,
        ease: "power2.out",
        onUpdate: render,
      });
      const minTime = new Promise((res) => setTimeout(res, 1500));

      Promise.all([whenLoaded(), minTime]).then(() => {
        if (!alive) return;
        crawl.kill();
        gsap
          .timeline()
          .to(progress, { v: 100, duration: 0.7, ease: "power2.inOut", onUpdate: render })
          .to(`.${styles.countInner}`, { yPercent: -110, duration: 0.7, ease: "expo.in" }, "+=0.15")
          .to(`.${styles.bar}`, { scaleX: 0, transformOrigin: "right", duration: 0.55, ease: "expo.in" }, "<0.05")
          .add(() => {
            // Hand the orange over to the pixel canvas, then break it apart.
            dissolve(canvas.current!, () => setDone(true));
            el.dataset.dissolving = "true";
            el.style.pointerEvents = "none";
            onReveal();
          });
      });

      return () => {
        alive = false;
      };
    },
    { scope: root },
  );

  if (done) return null;

  return (
    <div ref={root} className={styles.loader} data-loader aria-hidden="true">
      <canvas ref={canvas} className={styles.pixels} />
      <div className={styles.center}>
        <div className={styles.countMask}>
          <div className={styles.countInner}>
            <span className={styles.count}>0</span>
            <span className={styles.pct}>%</span>
          </div>
        </div>
        <div className={styles.bar}>
          <span className={styles.fill} />
        </div>
      </div>
    </div>
  );
}
