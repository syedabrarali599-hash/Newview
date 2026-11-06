"use client";

import { useRef, useState } from "react";
import { gsap, SplitText, useGSAP, EASE, prefersReducedMotion } from "@/lib/gsap";
import { CONTACT_HREF } from "@/lib/site";
import { LOGO_PATHS, LOGO_VIEWBOX } from "./Logo";
import styles from "./Different.module.css";

const WITH = [
  "Direct access to designers",
  "Clear, fast communication",
  "Built by experienced product designers",
  "Honest, transparent pricing",
  "Focused, practical design",
];

const WITHOUT = [
  "Layers of account managers",
  "Slow, unclear feedback loops",
  "Juniors learning on your project",
  "Hidden costs and surprise invoices",
  "Trend-driven, impractical design",
];

function Check() {
  return (
    <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true">
      <rect x="3" y="3" width="26" height="26" rx="7" fill="#1aa34a" />
      <path d="m10.5 16.5 3.8 3.8 7.4-8.3" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Cross() {
  return (
    <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true">
      <rect x="3" y="3" width="26" height="26" rx="7" fill="#c9c1ba" />
      <path d="m11.5 11.5 9 9m0-9-9 9" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

export default function Different() {
  const root = useRef<HTMLElement>(null);
  const list = useRef<HTMLUListElement>(null);
  // `on` drives the switch (instant); `withUs` drives the list, which swaps
  // after a short cross-fade.
  const [on, setOn] = useState(true);
  const [withUs, setWithUs] = useState(true);
  const onRef = useRef(true);
  const items = withUs ? WITH : WITHOUT;

  // Entrance: content first, then the big logo draws in, then the gradient blooms.
  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      if (prefersReducedMotion()) {
        gsap.set(q(".js-reveal"), { autoAlpha: 1 });
        return;
      }
      const heading = q(`.${styles.heading}`)[0] as HTMLElement;
      gsap.set(heading, { autoAlpha: 1 });
      const split = SplitText.create(heading, { type: "words" });
      const paths = q(`.${styles.bigLogo} path`);

      // Content first, then the logo and gradient right behind it (done in ~2.4s).
      gsap
        .timeline({ scrollTrigger: { trigger: root.current, start: "top 72%", once: true } })
        .fromTo(
          split.words,
          { autoAlpha: 0, yPercent: 38, filter: "blur(12px)" },
          { autoAlpha: 1, yPercent: 0, filter: "blur(0px)", duration: 0.9, stagger: 0.06, ease: EASE.out },
          0,
        )
        .fromTo(q(`.${styles.toggleRow}`), { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.7 }, 0.25)
        .fromTo(q(`.${styles.card}`), { autoAlpha: 0, y: 40, scale: 0.97 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.8 }, 0.4)
        .from(q(`.${styles.item}`), { autoAlpha: 0, x: -14, duration: 0.5, stagger: 0.05 }, 0.5)
        .fromTo(q(`.${styles.cta}`), { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.6 }, 0.7)
        // Logo behind
        .set(q(`.${styles.bigLogo}`), { autoAlpha: 1 }, 1)
        .fromTo(paths, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.9, ease: EASE.inOut, stagger: 0.08 }, 1)
        .fromTo(paths, { fillOpacity: 0 }, { fillOpacity: 1, duration: 0.6, ease: EASE.soft }, 1.3)
        // Gradient behind the logo
        .fromTo(
          q(`.${styles.gradient}`),
          { autoAlpha: 0, scale: 1.1 },
          { autoAlpha: 1, scale: 1, duration: 1, ease: EASE.soft },
          1.4,
        );
    },
    { scope: root },
  );

  // Toggle: cross-fade the list between "without" and "with".
  const { contextSafe } = useGSAP({ scope: root });
  const toggle = contextSafe(() => {
    const next = !onRef.current;
    onRef.current = next;
    setOn(next);
    const rows = list.current?.querySelectorAll(`.${styles.item}`);
    if (!rows || prefersReducedMotion()) {
      setWithUs(next);
      return;
    }
    gsap.to(rows, {
      autoAlpha: 0,
      y: -8,
      duration: 0.2,
      stagger: 0.02,
      ease: "power2.in",
      overwrite: true,
      onComplete: () => {
        setWithUs(onRef.current);
        requestAnimationFrame(() => {
          gsap.fromTo(
            list.current!.querySelectorAll(`.${styles.item}`),
            { autoAlpha: 0, y: 10 },
            { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.04, ease: EASE.out, overwrite: true },
          );
        });
      },
    });
  });

  return (
    <section ref={root} id="why-us" className={styles.section} data-mode={on ? "with" : "without"} aria-labelledby="diff-title">
      <div className={styles.bg} aria-hidden="true">
        <div className={`${styles.gradient} js-reveal`} />
        <svg className={`${styles.bigLogo} js-reveal`} viewBox={LOGO_VIEWBOX} preserveAspectRatio="xMinYMin meet">
          {LOGO_PATHS.map((d) => (
            <path key={d} d={d} pathLength={1} />
          ))}
        </svg>
      </div>

      <div className={styles.content}>
        <h2 id="diff-title" className={`section-heading ${styles.heading} js-reveal`}>
          What makes us different
        </h2>

        <div className={`${styles.toggleRow} js-reveal`}>
          <span className={styles.label} data-active={!on}>
            Without New View
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-label="Compare working with and without New View"
            className={styles.toggle}
            onClick={toggle}
          >
            <span className={styles.knob} />
          </button>
          <span className={styles.label} data-active={on}>
            With New View
          </span>
        </div>

        <div className={`${styles.card} js-reveal`}>
          <ul ref={list} className={styles.list}>
            {items.map((t) => (
              <li key={t} className={styles.item}>
                {withUs ? <Check /> : <Cross />}
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>

        <a href={CONTACT_HREF} className={`btn ${styles.cta} js-reveal`}>
          Work with us <span className="btn-arrow">→</span>
        </a>
      </div>
    </section>
  );
}
