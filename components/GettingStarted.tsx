"use client";

import { useRef } from "react";
import { gsap, ScrollTrigger, useGSAP, EASE, prefersReducedMotion } from "@/lib/gsap";
import { revealLines } from "@/lib/animations";
import Heading from "./Heading";
import PixelCanvas, { type PixelCanvasHandle } from "./PixelCanvas";
import { chat, plan, rocket, type PixelArtDef } from "./pixelArt.data";
import styles from "./GettingStarted.module.css";

const STEPS: { title: string; body: string; art: PixelArtDef }[] = [
  {
    title: "Tell us what you need",
    body: "Share your idea, product problem, or an early thought. You don't need to have everything figured out.",
    art: chat,
  },
  {
    title: "Get a clear plan",
    body: "We'll discuss scope, deliverables, timeline and budget, then recommend an approach that fits.",
    art: plan,
  },
  {
    title: "Let's make it happen",
    body: "Once we're aligned, we get to work. You stay connected to the designers throughout the project.",
    art: rocket,
  },
];

function StepCard({ title, body, art }: { title: string; body: string; art: PixelArtDef }) {
  const card = useRef<HTMLLIElement>(null);
  const pixels = useRef<PixelCanvasHandle>(null);
  const arts = useRef([art]).current;

  useGSAP(
    () => {
      ScrollTrigger.create({
        trigger: card.current,
        start: "top 80%",
        once: true,
        onEnter: () => gsap.delayedCall(0.35, () => pixels.current?.assemble()),
      });
    },
    { scope: card },
  );

  return (
    <li ref={card} className={`${styles.card} js-reveal`}>
      <div className={styles.art}>
        <PixelCanvas ref={pixels} arts={arts} host={card} className={styles.illo} label={title} />
      </div>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.body}>{body}</p>
    </li>
  );
}

export default function GettingStarted() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      revealLines(root.current!.querySelector<HTMLElement>(`.${styles.sub}`)!, {
        trigger: root.current!.querySelector(`.${styles.header}`)!,
      });
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
    <section ref={root} id="how-it-works" className={styles.section} aria-labelledby="start-title">
      <header className={styles.header}>
        <Heading className="section-heading">
          <span id="start-title">Getting started is the easy part.</span>
        </Heading>
        <p className={`section-sub ${styles.sub} js-reveal`}>
          You bring the challenge. We&apos;ll figure out the right way to tackle it.
        </p>
      </header>
      <ol className={styles.grid}>
        {STEPS.map((step) => (
          <StepCard key={step.title} {...step} />
        ))}
      </ol>
    </section>
  );
}
