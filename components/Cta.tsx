"use client";

import { useRef } from "react";
import { gsap, SplitText, useGSAP, EASE, prefersReducedMotion } from "@/lib/gsap";
import { CONTACT_HREF } from "@/lib/site";
import PixelCanvas, { type PixelCanvasHandle } from "./PixelCanvas";
import { idea } from "./pixelArt.data";
import styles from "./Cta.module.css";

const ARTS = [idea];

export default function Cta() {
  const root = useRef<HTMLElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const pixels = useRef<PixelCanvasHandle>(null);

  // The frame draws itself first, then fills, then the copy, button and art appear.
  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      if (prefersReducedMotion()) {
        gsap.set(q(".js-reveal"), { autoAlpha: 1 });
        pixels.current?.assemble();
        return;
      }
      const heading = q(`.${styles.heading}`)[0] as HTMLElement;
      const split = SplitText.create(heading, { type: "words" });

      gsap.set(q(".js-reveal"), { autoAlpha: 1 });
      gsap.set(q(`.${styles.edgeTop}, .${styles.edgeBottom}`), { scaleX: 0 });
      gsap.set(q(`.${styles.edgeLeft}, .${styles.edgeRight}`), { scaleY: 0 });
      gsap.set(q(`.${styles.handle}`), { scale: 0 });
      gsap.set(q(`.${styles.fill}`), { clipPath: "inset(50% 50% 50% 50%)" });
      gsap.set(split.words, { autoAlpha: 0, yPercent: 38, filter: "blur(10px)" });
      gsap.set(q(`.${styles.button}`), { autoAlpha: 0, y: 18 });

      // Quick and snappy: outline → fill → copy, all within ~1.4s.
      gsap
        .timeline({ scrollTrigger: { trigger: root.current, start: "top 80%", once: true } })
        .to(q(`.${styles.edgeTop}, .${styles.edgeBottom}`), { scaleX: 1, duration: 0.45, ease: "power3.inOut" }, 0)
        .to(q(`.${styles.edgeLeft}, .${styles.edgeRight}`), { scaleY: 1, duration: 0.45, ease: "power3.inOut" }, 0)
        .to(q(`.${styles.handle}`), { scale: 1, duration: 0.3, ease: "back.out(3)", stagger: 0.04 }, 0.25)
        .to(q(`.${styles.fill}`), { clipPath: "inset(0% 0% 0% 0%)", duration: 0.55, ease: EASE.inOut }, 0.3)
        .add(() => pixels.current?.assemble(), 0.5)
        .to(split.words, { autoAlpha: 1, yPercent: 0, filter: "blur(0px)", duration: 0.7, stagger: 0.04, ease: EASE.out }, 0.55)
        .to(q(`.${styles.button}`), { autoAlpha: 1, y: 0, duration: 0.5, ease: EASE.out }, 0.8);
    },
    { scope: root },
  );

  return (
    <section ref={root} id="contact" className={styles.section} aria-labelledby="cta-title">
      <div ref={frame} className={styles.frame} data-cta>
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
          <PixelCanvas
            ref={pixels}
            arts={ARTS}
            host={frame}
            className={styles.illo}
            label="An idea lightbulb flowing into a wireframe and then a finished design"
          />
        </div>
      </div>
    </section>
  );
}
