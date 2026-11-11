"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { gsap, ScrollTrigger, useGSAP, EASE, prefersReducedMotion } from "@/lib/gsap";
import { revealLines } from "@/lib/animations";
import { CONTACT_PATH } from "@/lib/site";
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
};

const PROJECTS: Project[] = [
  {
    title: "Agentic Chatbot UI",
    body: "A clean, intelligent chatbot interface designed to handle complex conversations without friction.",
    images: [ASSETS.work.agentic],
    kind: "desktop",
  },
  {
    title: "Gibili App",
    body: "A friendly mobile experience that helps people find exactly what they need in a few taps.",
    images: [ASSETS.work.phone],
    kind: "phone",
  },
  {
    title: "Seeneemaa",
    body: "A calm, conversion-focused sign-up flow that gets new members on board in under a minute.",
    images: [ASSETS.work.agentic, ASSETS.work.seeneemaa],
    kind: "desktop",
    bordered: true,
  },
  {
    title: "Tepigo",
    body: "A search-first quick-commerce app built for speed, clarity, and effortless repeat orders.",
    images: [ASSETS.work.phone],
    kind: "phone",
  },
  {
    title: "Oqualem",
    body: "A travel landing page that turns a simple promise into a clear, confident first impression.",
    images: [ASSETS.work.agentic, ASSETS.work.oqualem],
    kind: "desktop",
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
  const soon = useRef<HTMLSpanElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Case studies aren't published yet. With a mouse, the pointer becomes a
  // "Coming soon" circle over a case-study card (touch screens get a label
  // on each card instead — see Work.module.css).
  useEffect(() => {
    const badge = soon.current;
    const section = root.current;
    if (!badge || !section) return;
    const mouse = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduce = prefersReducedMotion();
    gsap.set(badge, { xPercent: -50, yPercent: -50, scale: 0, autoAlpha: 0 });
    const xTo = gsap.quickTo(badge, "x", { duration: reduce ? 0.01 : 0.5, ease: "power3" });
    const yTo = gsap.quickTo(badge, "y", { duration: reduce ? 0.01 : 0.5, ease: "power3" });

    let inside = false;
    let px = -1;
    let py = -1;
    const cardAt = (x: number, y: number) => document.elementFromPoint(x, y)?.closest("[data-soon]");
    const update = (onCard: boolean, jump: boolean) => {
      if (onCard && !inside) {
        inside = true;
        xTo(px, px); // appear right under the pointer, then follow it
        yTo(py, py);
        gsap.to(badge, { scale: 1, autoAlpha: 1, duration: reduce ? 0 : 0.5, ease: "back.out(1.7)", overwrite: "auto" });
      } else if (!onCard && inside) {
        inside = false;
        gsap.to(badge, { scale: 0, autoAlpha: 0, duration: reduce ? 0 : 0.3, ease: "power2.in", overwrite: "auto" });
      }
      if (onCard && !jump) {
        xTo(px);
        yTo(py);
      }
    };
    const onMove = (e: PointerEvent) => {
      if (!mouse.matches || e.pointerType === "touch") return;
      px = e.clientX;
      py = e.clientY;
      update(!!(e.target as Element).closest?.("[data-soon]"), false);
    };
    const onLeave = () => update(false, false);
    // Cards scroll under a still pointer, so re-check what's under it.
    const onScroll = () => {
      if (mouse.matches && px >= 0) update(!!cardAt(px, py), true);
    };

    section.addEventListener("pointermove", onMove);
    section.addEventListener("pointerleave", onLeave);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      section.removeEventListener("pointermove", onMove);
      section.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("scroll", onScroll);
      gsap.killTweensOf(badge);
    };
  }, [mounted]);

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
          <article key={p.title} className={`${styles.card} js-reveal`} data-soon>
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
                    loading="eager"
                    decoding="async"
                    fetchPriority="low"
                    draggable={false}
                  />
                ))}
              </div>
              <span className={styles.stamp} aria-hidden="true">
                Coming
                <br />
                soon
              </span>
            </div>
            <div className={styles.info}>
              <h3 className={styles.title}>{p.title}</h3>
              <p className={styles.body}>{p.body}</p>
            </div>
            <span className={`${styles.more} ${styles.onHover}`} aria-hidden="true">
              View Project <span className={styles.arrow}>→</span>
            </span>
            <span className={`${styles.more} ${styles.onTouch}`} aria-hidden="true">
              Case study coming soon
            </span>
            <span className="sr-only">Case study coming soon.</span>
          </article>
        ))}

        <a href={CONTACT_PATH} className={`${styles.card} ${styles.saved} js-reveal`}>
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

      {mounted &&
        createPortal(
          <span ref={soon} className={styles.soon} aria-hidden="true">
            Coming
            <br />
            soon
          </span>,
          document.body,
        )}
    </section>
  );
}
