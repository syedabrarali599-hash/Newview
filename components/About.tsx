"use client";

import { useRef } from "react";
import { gsap, SplitText, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import styles from "./About.module.css";

/**
 * Two statement paragraphs that sit at 50% opacity and "fill in" line by line
 * as you scroll, like ink running left to right across each line.
 */
export default function About() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const paragraphs = gsap.utils.toArray<HTMLElement>(`.${styles.text}`, root.current);

      SplitText.create(paragraphs, {
        type: "lines",
        linesClass: styles.line,
        autoSplit: true,
        onSplit(self) {
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: root.current,
              start: "top 75%",
              end: "bottom 55%",
              scrub: 0.8,
            },
          });
          self.lines.forEach((line) => {
            tl.fromTo(
              line,
              { backgroundPositionX: "100%" },
              { backgroundPositionX: "0%", ease: "none", duration: 1 },
            );
          });
          return tl;
        },
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} id="about" className={styles.about}>
      <p className={styles.text}>
        New View brings experienced designers directly to your team, combining years of product
        experience with fresh thinking.
      </p>
      <p className={styles.text}>
        We turn ideas into impactful products, move fast, and help shape your vision into reality,
        without agency layers, unnecessary delays, or inflated costs.
      </p>
    </section>
  );
}
