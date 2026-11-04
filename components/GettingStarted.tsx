"use client";

import { useRef } from "react";
import { gsap, ScrollTrigger, useGSAP, EASE, prefersReducedMotion } from "@/lib/gsap";
import { fadeUp } from "@/lib/animations";
import Heading from "./Heading";
import styles from "./GettingStarted.module.css";

const INK = "#220d04";
const ORANGE = "#e85313";
const YELLOW = "#ffd400";

function Chat() {
  return (
    <svg viewBox="0 0 220 170" className={styles.illo} aria-hidden="true">
      <g className={styles.rays} stroke={YELLOW} strokeWidth="6" strokeLinecap="round">
        <path d="M96 22 99 8" />
        <path d="M112 26 124 14" />
        <path d="M82 28 72 18" />
      </g>
      <g className={styles.bubbleA}>
        <path
          d="M40 44h88a10 10 0 0 1 10 10v44a10 10 0 0 1-10 10H70l-18 16v-16H40a10 10 0 0 1-10-10V54a10 10 0 0 1 10-10Z"
          fill="#fff"
          stroke={INK}
          strokeWidth="5"
          strokeLinejoin="round"
        />
        <path d="M50 64h68M50 78h56M50 92h40" stroke={INK} strokeWidth="5" strokeLinecap="round" />
      </g>
      <g className={styles.bubbleB}>
        <path
          d="M120 82h68a10 10 0 0 1 10 10v34a10 10 0 0 1-10 10h-6v16l-18-16h-44a10 10 0 0 1-10-10V92a10 10 0 0 1 10-10Z"
          fill={ORANGE}
          stroke={INK}
          strokeWidth="5"
          strokeLinejoin="round"
        />
        <circle className={styles.dot} cx="138" cy="109" r="5" fill="#fff" />
        <circle className={styles.dot} cx="155" cy="109" r="5" fill="#fff" />
        <circle className={styles.dot} cx="172" cy="109" r="5" fill="#fff" />
      </g>
      <path
        className={styles.sparkle}
        d="M28 128 32 138 42 142 32 146 28 156 24 146 14 142 24 138Z"
        fill={YELLOW}
        stroke={INK}
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Plan() {
  const rows = [52, 78, 104, 130];
  return (
    <svg viewBox="0 0 220 170" className={styles.illo} aria-hidden="true">
      <g className={styles.rays} stroke={YELLOW} strokeWidth="6" strokeLinecap="round">
        <path d="M60 18 66 6" />
        <path d="M48 28 36 20" />
        <path d="M44 44 30 42" />
      </g>
      <rect x="58" y="38" width="96" height="120" rx="6" fill="#fff" stroke={INK} strokeWidth="5" transform="rotate(-6 106 98)" />
      <g className={styles.doc}>
        <path d="M74 30h70l18 18v108a6 6 0 0 1-6 6H74a6 6 0 0 1-6-6V36a6 6 0 0 1 6-6Z" fill="#fff" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
        <path d="M144 30v18h18" fill="none" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
        {rows.map((y, i) => (
          <g key={y}>
            <rect x="80" y={y} width="18" height="18" rx="3" fill={ORANGE} stroke={INK} strokeWidth="4" />
            <path
              className={styles.tick}
              style={{ animationDelay: `${0.1 + i * 0.12}s` }}
              d={`M84 ${y + 9} l4 4 l7 -8`}
              fill="none"
              stroke="#fff"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={1}
            />
            <path d={`M108 ${y + 9}h${i % 2 ? 30 : 40}`} stroke={INK} strokeWidth="5" strokeLinecap="round" />
          </g>
        ))}
      </g>
      <path
        className={styles.sparkle}
        d="M182 96 185 104 193 107 185 110 182 118 179 110 171 107 179 104Z"
        fill={YELLOW}
        stroke={INK}
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Rocket() {
  return (
    <svg viewBox="0 0 220 170" className={styles.illo} aria-hidden="true">
      <path className={styles.sparkle} d="M50 34 53 42 61 45 53 48 50 56 47 48 39 45 47 42Z" fill={YELLOW} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <path className={styles.sparkle} d="M176 86 179 94 187 97 179 100 176 108 173 100 165 97 173 94Z" fill={YELLOW} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <g className={styles.clouds}>
        <path
          d="M42 150c-2-12 12-18 20-12 4-12 22-12 26-2 6-8 20-6 22 4 8-6 22-2 22 8 10-8 26-4 28 6 8-2 16 2 16 8H38c-4 0-4-6 4-12Z"
          fill="#fff"
          stroke={INK}
          strokeWidth="4.5"
          strokeLinejoin="round"
        />
      </g>
      <g className={styles.rocket}>
        <g className={styles.flame}>
          <path d="M96 118c-10 12-12 24-4 34 2-8 6-10 10-12 2 8 6 12 12 14 2-12-2-24-10-36Z" fill={ORANGE} stroke={INK} strokeWidth="4" strokeLinejoin="round" />
          <path d="M100 124c-4 8-4 14 0 20 2-4 4-6 6-6 2 4 4 6 6 6 0-8-4-14-8-20Z" fill={YELLOW} />
        </g>
        <path d="M86 92 66 104l-2 22 22-12Z" fill={ORANGE} stroke={INK} strokeWidth="4.5" strokeLinejoin="round" />
        <path d="M128 92l20 12 2 22-22-12Z" fill={ORANGE} stroke={INK} strokeWidth="4.5" strokeLinejoin="round" transform="rotate(8 128 92)" />
        <path
          d="M108 18c22 14 32 40 26 72l-8 30H90l-8-30c-6-32 4-58 26-72Z"
          fill="#fff"
          stroke={INK}
          strokeWidth="5"
          strokeLinejoin="round"
          transform="rotate(14 108 80)"
        />
        <path d="M108 18c8 5 14 12 18 20H90c4-8 10-15 18-20Z" fill={ORANGE} stroke={INK} strokeWidth="4.5" strokeLinejoin="round" transform="rotate(14 108 80)" />
        <circle cx="112" cy="66" r="12" fill="#3b82f6" stroke={INK} strokeWidth="4.5" />
        <circle cx="108" cy="62" r="3.5" fill="#fff" />
      </g>
    </svg>
  );
}

const STEPS = [
  {
    title: "Tell us what you need",
    body: "Share your idea, product problem, or an early thought. You don't need to have everything figured out.",
    Illo: Chat,
  },
  {
    title: "Get a clear plan",
    body: "We'll discuss scope, deliverables, timeline and budget, then recommend an approach that fits.",
    Illo: Plan,
  },
  {
    title: "Let's make it happen",
    body: "Once we're aligned, we get to work. You stay connected to the designers throughout the project.",
    Illo: Rocket,
  },
];

export default function GettingStarted() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      fadeUp(`.${styles.sub}`, { trigger: root.current!.querySelector(`.${styles.header}`)!, start: "top 85%", delay: 0.45 });
      const cards = gsap.utils.toArray<HTMLElement>(`.${styles.card}`, root.current);
      if (prefersReducedMotion()) {
        gsap.set(cards, { autoAlpha: 1 });
        return;
      }
      gsap.set(cards, { autoAlpha: 0, y: 80 });
      ScrollTrigger.batch(cards, {
        start: "top 88%",
        once: true,
        onEnter: (batch) =>
          gsap.to(batch, { autoAlpha: 1, y: 0, duration: 1.2, ease: EASE.expo, stagger: 0.16, overwrite: true }),
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className={styles.section} aria-labelledby="start-title">
      <header className={styles.header}>
        <Heading className="section-heading">
          <span id="start-title">Getting started is the easy part.</span>
        </Heading>
        <p className={`section-sub ${styles.sub} js-reveal`}>
          You bring the challenge. We&apos;ll figure out the right way to tackle it.
        </p>
      </header>
      <ol className={styles.grid}>
        {STEPS.map(({ title, body, Illo }) => (
          <li key={title} className={`${styles.card} js-reveal`}>
            <div className={styles.art}>
              <Illo />
            </div>
            <h3 className={styles.title}>{title}</h3>
            <p className={styles.body}>{body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
