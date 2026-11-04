"use client";

import { useRef } from "react";
import { gsap, SplitText, useGSAP, EASE, prefersReducedMotion } from "@/lib/gsap";
import { CONTACT_HREF } from "@/lib/site";
import CtaIllustration from "./CtaIllustration";
import styles from "./Cta.module.css";

export default function Cta() {
  const root = useRef<HTMLElement>(null);

  // The frame draws itself first, then fills, then the copy, button and art appear.
  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      if (prefersReducedMotion()) {
        gsap.set(q(".js-reveal"), { autoAlpha: 1 });
        return;
      }
      const heading = q(`.${styles.heading}`)[0] as HTMLElement;
      const split = SplitText.create(heading, { type: "words" });

      gsap.set(q(".js-reveal"), { autoAlpha: 1 });
      gsap.set(q(`.${styles.edgeTop}, .${styles.edgeBottom}`), { scaleX: 0 });
      gsap.set(q(`.${styles.edgeLeft}, .${styles.edgeRight}`), { scaleY: 0 });
      gsap.set(q(`.${styles.handle}`), { scale: 0 });
      gsap.set(q(`.${styles.fill}`), { clipPath: "inset(50% 50% 50% 50%)" });
      gsap.set(split.words, { autoAlpha: 0, yPercent: 38, filter: "blur(12px)" });
      gsap.set(q(`.${styles.button}`), { autoAlpha: 0, y: 24 });
      gsap.set(q(`.${styles.pop}`), { autoAlpha: 0, scale: 0.6, transformOrigin: "50% 50%" });

      gsap
        .timeline({ scrollTrigger: { trigger: root.current, start: "top 68%", once: true } })
        // 1. Draw the outline clockwise
        .to(q(`.${styles.edgeTop}`), { scaleX: 1, duration: 0.5, ease: "power2.in" })
        .to(q(`.${styles.edgeRight}`), { scaleY: 1, duration: 0.3, ease: "none" })
        .to(q(`.${styles.edgeBottom}`), { scaleX: 1, duration: 0.5, ease: "none" })
        .to(q(`.${styles.edgeLeft}`), { scaleY: 1, duration: 0.3, ease: "power2.out" })
        .to(q(`.${styles.handle}`), { scale: 1, duration: 0.45, ease: "back.out(3)", stagger: 0.06 }, "-=0.25")
        // 2. Fill it with colour
        .to(q(`.${styles.fill}`), { clipPath: "inset(0% 0% 0% 0%)", duration: 1, ease: EASE.inOut }, "-=0.2")
        // 3. Copy, button, illustration
        .to(split.words, { autoAlpha: 1, yPercent: 0, filter: "blur(0px)", duration: 1.1, stagger: 0.07, ease: EASE.out }, "-=0.35")
        .to(q(`.${styles.button}`), { autoAlpha: 1, y: 0, duration: 0.8, ease: EASE.out }, "-=0.7")
        .to(q(`.${styles.pop}`), { autoAlpha: 1, scale: 1, duration: 0.7, ease: "back.out(1.8)", stagger: 0.09 }, "-=0.8");
    },
    { scope: root },
  );

  return (
    <section ref={root} className={styles.section} aria-labelledby="cta-title">
      <div className={styles.frame} data-cta>
        <span className={`${styles.edge} ${styles.edgeTop}`} aria-hidden="true" />
        <span className={`${styles.edge} ${styles.edgeRight}`} aria-hidden="true" />
        <span className={`${styles.edge} ${styles.edgeBottom}`} aria-hidden="true" />
        <span className={`${styles.edge} ${styles.edgeLeft}`} aria-hidden="true" />
        <div className={styles.fill} aria-hidden="true" />
        {(["tl", "tr", "bl", "br"] as const).map((c) => (
          <span key={c} className={`${styles.handle} ${styles[c]}`} aria-hidden="true" />
        ))}

        <div className={`${styles.copy} js-reveal`}>
          <h2 id="cta-title" className={styles.heading}>
            Got a great idea you want to bring to life?
          </h2>
          <a href={CONTACT_HREF} className={`btn btn--light ${styles.button}`}>
            Tell us your idea <span className="btn-arrow">→</span>
          </a>
        </div>
        <div className={`${styles.art} js-reveal`}>
          <CtaIllustration />
        </div>
      </div>
    </section>
  );
}
