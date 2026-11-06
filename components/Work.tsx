"use client";

import { useRef } from "react";
import { gsap, ScrollTrigger, useGSAP, EASE, prefersReducedMotion } from "@/lib/gsap";
import { revealLines } from "@/lib/animations";
import { CONTACT_HREF } from "@/lib/site";
import Heading from "./Heading";
import { ASSETS } from "@/lib/assets";
import styles from "./Work.module.css";

type Project = {
  title: string;
  body: string;
  /** Image layers, bottom to top, as stacked in the Figma frame. */
  images: string[];
  kind: "desktop" | "phone";
  bordered?: boolean;
  href: string;
};

const PROJECTS: Project[] = [
  {
    title: "Agentic Chatbot UI",
    body: "A clean, intelligent chatbot interface designed to handle complex conversations without friction.",
    images: [ASSETS.work.agentic],
    kind: "desktop",
    href: "#work",
  },
  {
    title: "Gibili App",
    body: "A friendly mobile experience that helps people find exactly what they need in a few taps.",
    images: [ASSETS.work.phone],
    kind: "phone",
    href: "#work",
  },
  {
    title: "Seeneemaa",
    body: "A calm, conversion-focused sign-up flow that gets new members on board in under a minute.",
    images: [ASSETS.work.agentic, ASSETS.work.seeneemaa],
    kind: "desktop",
    bordered: true,
    href: "#work",
  },
  {
    title: "Tepigo",
    body: "A search-first quick-commerce app built for speed, clarity, and effortless repeat orders.",
    images: [ASSETS.work.phone],
    kind: "phone",
    href: "#work",
  },
  {
    title: "Oqualem",
    body: "A travel landing page that turns a simple promise into a clear, confident first impression.",
    images: [ASSETS.work.agentic, ASSETS.work.oqualem],
    kind: "desktop",
    href: "#work",
  },
];

/**
 * Highlight squares on the "saved for you" card, at their Figma positions
 * (px in a 411px-wide card), plus where each one hops to on hover — always
 * a whole number of 20px grid cells.
 */
const SQUARES = [
  { x: 80.67, y: 60, hop: [20, 20] },
  { x: 200.67, y: 160, hop: [-40, 0] },
  { x: 380.67, y: 200, hop: [-20, 40] },
  { x: 200.67, y: 300, hop: [40, -20] },
  { x: 260.67, y: 80, hop: [-20, 40] },
  { x: 340.67, y: 40, hop: [-40, 20] },
  { x: 320.67, y: 260, hop: [0, -40] },
  { x: 60.67, y: 360, hop: [40, -20] },
  { x: 60.67, y: 240, hop: [20, -40] },
];

function ArrowUpRight() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true">
      <path d="M6 18 18 6M18 14V6h-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Work() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const cards = gsap.utils.toArray<HTMLElement>(`.${styles.card}`, root.current);
      revealLines(root.current!.querySelector<HTMLElement>(`.${styles.sub}`)!, {
        trigger: root.current!.querySelector(`.${styles.header}`)!,
      });
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
              <div
                className={`${styles.shot} ${p.kind === "phone" ? styles.phone : styles.desktop} ${p.bordered ? styles.bordered : ""}`}
              >
                {p.images.map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={src}
                    src={src}
                    alt={i === p.images.length - 1 ? `${p.title} preview` : ""}
                    loading="lazy"
                    draggable={false}
                  />
                ))}
              </div>
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
          {SQUARES.map((sq) => (
            <span
              key={`${sq.x}-${sq.y}`}
              className={styles.square}
              style={
                {
                  "--x": sq.x,
                  "--y": sq.y,
                  "--hx": sq.hop[0],
                  "--hy": sq.hop[1],
                } as React.CSSProperties
              }
              aria-hidden="true"
            />
          ))}
          <span className={styles.circle} aria-hidden="true">
            <ArrowUpRight />
          </span>
          <div className={styles.savedInfo}>
            <h3 className={styles.title}>This spot is saved for you.</h3>
            <p className={styles.body}>
              Your project deserves a place here.
              <br />
              Let&apos;s make something worth sharing.
            </p>
          </div>
        </a>
      </div>
    </section>
  );
}
