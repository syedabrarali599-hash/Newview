"use client";

import { useRef, useState } from "react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import styles from "./Loader.module.css";

type Props = {
  /** Fired when the panels start leaving – the page should begin its intro. */
  onReveal: () => void;
};

const PANELS = 6;

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

export default function Loader({ onReveal }: Props) {
  const root = useRef<HTMLDivElement>(null);
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
          .timeline({ onComplete: () => setDone(true) })
          .to(progress, { v: 100, duration: 0.7, ease: "power2.inOut", onUpdate: render })
          .to(`.${styles.countInner}`, { yPercent: -110, duration: 0.8, ease: "expo.in" }, "+=0.15")
          .to(`.${styles.bar}`, { scaleX: 0, transformOrigin: "right", duration: 0.6, ease: "expo.in" }, "<0.1")
          .to(`.${styles.lines}`, { autoAlpha: 0, duration: 0.5 }, "<")
          .to(
            `.${styles.panelFill}`,
            { scaleY: 1, duration: 0.7, ease: "expo.inOut", stagger: 0.07 },
            "-=0.15",
          )
          .add(() => onReveal(), "-=0.2")
          .to(
            `.${styles.panel}`,
            { yPercent: -100, duration: 0.95, ease: "expo.inOut", stagger: 0.07 },
            "-=0.45",
          );
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
      <div className={styles.panels}>
        {Array.from({ length: PANELS }, (_, i) => (
          <span key={i} className={styles.panel}>
            <span className={styles.panelFill} />
          </span>
        ))}
      </div>
      <div className={styles.lines} />
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
