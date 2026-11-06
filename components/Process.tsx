"use client";

import { useRef } from "react";
import { gsap, SplitText, useGSAP, EASE, prefersReducedMotion } from "@/lib/gsap";
import { CONTACT_HREF } from "@/lib/site";
import styles from "./Process.module.css";

const STEPS = [
  { n: "[ 01 ]", text: "Understand problem", side: "left" },
  { n: "[ 02 ]", text: "Find the direction", side: "right" },
  { n: "[ 03 ]", text: "Design and refine", side: "left" },
  { n: "[ 04 ]", text: "Deliver and hand over", side: "right" },
] as const;

/** The "Let's Make It Happen" frame, exactly as designed: a white box with
 *  four corner handles. Hover fills it with pixels and nudges the handles
 *  outwards, like grabbing a frame to resize it. */
function MakeItHappen() {
  return (
    <a href={CONTACT_HREF} className={`${styles.box} js-reveal`} data-happen data-pixel-hover>
      {(["tl", "tr", "bl", "br"] as const).map((c) => (
        <span key={c} className={`${styles.handle} ${styles[c]}`} aria-hidden="true" />
      ))}
      <span className={styles.boxText}>Let&apos;s Make It Happen</span>
    </a>
  );
}

export default function Process() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      if (prefersReducedMotion()) {
        gsap.set(q(".js-reveal"), { autoAlpha: 1 });
        return;
      }
      const intro = q(`.${styles.intro}`)[0];
      const panel = q(`.${styles.panel}`)[0];
      const statement = q(`.${styles.statement}`)[0] as HTMLElement;
      gsap.set(statement, { autoAlpha: 1 });
      const split = SplitText.create(q(`.${styles.words}`), { type: "words" });

      // 1. The orange panel rises from the bottom while scaling up to fill the screen.
      gsap.fromTo(
        panel,
        { scale: 0.55, borderRadius: 36 },
        {
          scale: 1,
          borderRadius: 0,
          ease: "none",
          scrollTrigger: { trigger: intro, start: "top bottom", end: "top top", scrub: 0.6 },
        },
      );

      // 2. Pinned: braces glide in from the edges and the words arrive from the right.
      gsap
        .timeline({
          scrollTrigger: { trigger: intro, start: "top top", end: "+=110%", pin: true, scrub: 0.8 },
        })
        .fromTo(q(`.${styles.braceL}`), { xPercent: -260, autoAlpha: 0 }, { xPercent: 0, autoAlpha: 1, ease: EASE.soft, duration: 1 }, 0)
        .fromTo(q(`.${styles.braceR}`), { xPercent: 260, autoAlpha: 0 }, { xPercent: 0, autoAlpha: 1, ease: EASE.soft, duration: 1 }, 0)
        .fromTo(
          split.words,
          { autoAlpha: 0, x: 140, filter: "blur(10px)" },
          { autoAlpha: 1, x: 0, filter: "blur(0px)", ease: EASE.soft, duration: 0.8, stagger: 0.09 },
          0.1,
        )
        .to({}, { duration: 0.6 });

      // 3. Each step slides in from its own side as you scroll.
      q(`.${styles.step}`).forEach((row) => {
        const fromLeft = row.getAttribute("data-side") === "left";
        gsap.fromTo(
          row,
          { xPercent: fromLeft ? -55 : 55, autoAlpha: 0 },
          {
            xPercent: 0,
            autoAlpha: 1,
            ease: "power2.out",
            scrollTrigger: { trigger: row, start: "top 100%", end: "top 55%", scrub: 0.9 },
          },
        );
      });

      // 4. The CTA frame pops in, then its handles snap to the corners.
      const happen = q("[data-happen]")[0];
      gsap
        .timeline({ scrollTrigger: { trigger: happen, start: "top 80%", once: true } })
        .fromTo(happen, { autoAlpha: 0, scale: 0.86, y: 40 }, { autoAlpha: 1, scale: 1, y: 0, duration: 1.3, ease: EASE.expo })
        .from(q(`.${styles.handle}`), { scale: 0, duration: 0.5, ease: "back.out(3)", stagger: 0.07, clearProps: "transform" }, "-=0.8")
        .from(q(`.${styles.boxText}`), { yPercent: 60, autoAlpha: 0, filter: "blur(8px)", duration: 1, ease: EASE.out }, "-=0.7");
    },
    { scope: root },
  );

  return (
    <section ref={root} className={styles.process} aria-label="Our process">
      <div className={styles.intro}>
        <div className={styles.panel}>
          <h2 className={`${styles.statement} js-reveal`}>
            <span className={styles.braceL} aria-hidden="true">
              {"{"}
            </span>
            <span className={styles.words}>A good process makes good work possible.</span>
            <span className={styles.braceR} aria-hidden="true">
              {"}"}
            </span>
          </h2>
        </div>
      </div>

      <ol className={styles.steps}>
        {STEPS.map((s) => (
          <li key={s.n} className={`${styles.step} ${styles[s.side]} js-reveal`} data-side={s.side}>
            <span className={styles.num}>{s.n}</span>
            <span className={styles.stepText}>{s.text}</span>
          </li>
        ))}
      </ol>

      <div className={styles.happen}>
        <MakeItHappen />
      </div>
    </section>
  );
}
