"use client";

import { useRef } from "react";
import { gsap, SplitText, useGSAP, EASE, prefersReducedMotion } from "@/lib/gsap";
import { useExperience } from "@/lib/experience";
import Heading from "./Heading";
import HeroPlayground from "./HeroPlayground";
import { CONTACT_PATH } from "@/lib/site";
import styles from "./Hero.module.css";

export default function Hero() {
  const { ready } = useExperience();
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!ready) return;
      const q = gsap.utils.selector(root);
      if (prefersReducedMotion()) {
        gsap.set(q(".js-reveal"), { autoAlpha: 1 });
        return;
      }

      const copy = q(`.${styles.copy}`)[0] as HTMLElement;
      gsap.set(copy, { autoAlpha: 1 });
      const lines = SplitText.create(copy, { type: "lines", mask: "lines", autoSplit: true });

      const tl = gsap.timeline({ delay: 0.55 });
      tl.from(lines.lines, { yPercent: 105, duration: 1.1, ease: EASE.out, stagger: 0.09 })
        .fromTo(
          q(`.${styles.cta}`),
          { autoAlpha: 0, clipPath: "inset(0 100% 0 0)" },
          { autoAlpha: 1, clipPath: "inset(0 0% 0 0)", duration: 0.9, ease: EASE.inOut },
          "-=0.75",
        )
        .from(q(`.${styles.ctaLabel}`), { xPercent: -40, autoAlpha: 0, duration: 0.8, ease: EASE.out }, "-=0.5");
    },
    { dependencies: [ready], scope: root },
  );

  return (
    <section ref={root} id="top" className={styles.hero}>
      <div className={styles.top}>
        <Heading as="h1" className={styles.title} immediate play={ready} delay={0.25}>
          Every brand,
          <br />
          needs a New view.
        </Heading>
        <div className={styles.side}>
          <p className={`${styles.copy} js-reveal`}>
            We bring you closer to the people designing your product, making collaboration clearer,
            feedback faster, and great ideas easier to bring to life.
          </p>
          <a href={CONTACT_PATH} className={`btn ${styles.cta} js-reveal`}>
            <span className={styles.ctaLabel}>
              Tell us your idea <span className="btn-arrow">→</span>
            </span>
          </a>
        </div>
      </div>
      <HeroPlayground play={ready} />
    </section>
  );
}
