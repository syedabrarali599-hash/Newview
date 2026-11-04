"use client";

import { useRef } from "react";
import { gsap, ScrollTrigger, useGSAP, EASE, prefersReducedMotion } from "@/lib/gsap";
import { fadeUp } from "@/lib/animations";
import { CONTACT_HREF } from "@/lib/site";
import Heading from "./Heading";
import styles from "./Work.module.css";

type Project = {
  title: string;
  body: string;
  image: string;
  kind: "desktop" | "phone";
  href: string;
};

const PROJECTS: Project[] = [
  {
    title: "Agentic Chatbot UI",
    body: "A clean, intelligent chatbot interface designed to handle complex conversations without friction.",
    image: "/work/agentic.svg",
    kind: "desktop",
    href: "#work",
  },
  {
    title: "Gibili App",
    body: "A friendly mobile experience that helps people find exactly what they need in a few taps.",
    image: "/work/gibili.svg",
    kind: "phone",
    href: "#work",
  },
  {
    title: "Seeneemaa",
    body: "A calm, conversion-focused sign-up flow that gets new members on board in under a minute.",
    image: "/work/seeneemaa.svg",
    kind: "desktop",
    href: "#work",
  },
  {
    title: "Tepigo",
    body: "A search-first quick-commerce app built for speed, clarity, and effortless repeat orders.",
    image: "/work/tepigo.svg",
    kind: "phone",
    href: "#work",
  },
  {
    title: "Oqualem",
    body: "A travel landing page that turns a simple promise into a clear, confident first impression.",
    image: "/work/oqualem.svg",
    kind: "desktop",
    href: "#work",
  },
];

// Scattered highlight squares on the "saved for you" card (grid coordinates).
const SQUARES = [
  [3, 2],
  [12, 3],
  [6, 6],
  [16, 8],
  [2, 10],
  [10, 12],
  [14, 15],
  [5, 17],
  [18, 19],
];

function ArrowUpRight() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true">
      <path d="M7 17 17 7M17 7H8M17 7v9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Work() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const cards = gsap.utils.toArray<HTMLElement>(`.${styles.card}`, root.current);
      fadeUp(`.${styles.sub}`, { trigger: root.current!.querySelector(`.${styles.header}`)!, start: "top 85%", delay: 0.45 });
      if (prefersReducedMotion()) {
        gsap.set(cards, { autoAlpha: 1 });
        return;
      }
      gsap.set(cards, { autoAlpha: 0, y: 70 });
      ScrollTrigger.batch(cards, {
        start: "top 88%",
        once: true,
        onEnter: (batch) =>
          gsap.to(batch, {
            autoAlpha: 1,
            y: 0,
            duration: 1.2,
            ease: EASE.expo,
            stagger: 0.14,
            overwrite: true,
          }),
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} id="work" className={styles.work} aria-labelledby="work-title">
      <header className={styles.header}>
        <Heading className="section-heading">
          <span id="work-title">A closer look at our work.</span>
        </Heading>
        <p className={`section-sub ${styles.sub} js-reveal`}>
          A few problems, plenty of thinking, and the design decisions in between.
        </p>
      </header>

      <div className={styles.grid}>
        {PROJECTS.map((p) => (
          <a key={p.title} href={p.href} className={`${styles.card} js-reveal`}>
            <div className={styles.media}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.image}
                alt={`${p.title} preview`}
                className={p.kind === "phone" ? styles.phone : styles.desktop}
                loading="lazy"
                draggable={false}
              />
            </div>
            <div className={styles.info}>
              <h3 className={styles.title}>{p.title}</h3>
              <p className={styles.body}>{p.body}</p>
            </div>
            <span className={styles.more}>
              View Project <span className={styles.arrow}>→</span>
            </span>
          </a>
        ))}

        <a href={CONTACT_HREF} className={`${styles.card} ${styles.saved} js-reveal`}>
          <span className={styles.savedGrid} aria-hidden="true" />
          {SQUARES.map(([x, y]) => (
            <span
              key={`${x}-${y}`}
              className={styles.square}
              style={{ left: `calc(${x} * var(--c))`, top: `calc(${y} * var(--c))` }}
              aria-hidden="true"
            />
          ))}
          <span className={styles.circle} aria-hidden="true">
            <ArrowUpRight />
          </span>
          <div className={styles.savedInfo}>
            <h3 className={styles.title}>This spot is saved for you.</h3>
            <p className={styles.body}>Your project deserves a place here. Let&apos;s make something worth sharing.</p>
          </div>
        </a>
      </div>
    </section>
  );
}
