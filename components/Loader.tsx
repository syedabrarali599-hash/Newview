"use client";

import { useRef, useState } from "react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import { pixelDissolve, whenLoaded } from "@/lib/pixelWipe";
import styles from "./Loader.module.css";

type Props = {
  /** Fired when the orange starts breaking apart – the page begins its intro. */
  onReveal: () => void;
};

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
            pixelDissolve(canvas.current!).then(() => setDone(true));
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
