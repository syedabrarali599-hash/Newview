"use client";

import { useRef } from "react";
import { gsap, SplitText, ScrollTrigger, useGSAP, EASE, prefersReducedMotion } from "@/lib/gsap";
import { revealHeading, fadeUp } from "@/lib/animations";
import { CONTACT_EMAIL } from "@/lib/site";
import Heading from "./Heading";
import PixelArt, { type PixelArtHandle, type PixelBehavior } from "./PixelArt";
import { ghost, cherry, potion, heart, type PixelArtData } from "./pixelArt.data";
import styles from "./Services.module.css";

type Service = {
  index: string;
  title: string;
  body: string;
  cta: string;
  art: PixelArtData;
  behavior: PixelBehavior;
  label: string;
};

const SERVICES: Service[] = [
  {
    index: "[ 01 ]",
    title: "Brand Identity",
    body: "Logos, visual systems, color, and typography that define how your brand shows up.",
    cta: "Build your brand",
    art: ghost,
    behavior: "ghost",
    label: "Pixel-art orange ghost whose eyes follow your cursor",
  },
  {
    index: "[ 02 ]",
    title: "Web & App UI Design",
    body: "Clean, modern interfaces designed for clarity, usability, and strong visual impact.",
    cta: "Design your product",
    art: cherry,
    behavior: "cherry",
    label: "Pixel-art pair of cherries swaying on their stem",
  },
  {
    index: "[ 03 ]",
    title: "Design Systems",
    body: "Scalable components and guidelines that keep your product consistent as it grows.",
    cta: "Scale with a system",
    art: potion,
    behavior: "potion",
    label: "Pixel-art bubbling potion bottle",
  },
  {
    index: "[ 04 ]",
    title: "Marketing & Creative Assets",
    body: "Landing pages, social visuals, and campaign assets that support launches and day-to-day needs.",
    cta: "Launch a campaign",
    art: heart,
    behavior: "heart",
    label: "Pixel-art beating heart",
  },
];

const mailto = (s: Service) =>
  `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`${s.title} project`)}`;

function ServiceCard({ service, i }: { service: Service; i: number }) {
  const card = useRef<HTMLElement>(null);
  const art = useRef<PixelArtHandle>(null);

  useGSAP(
    () => {
      const el = card.current!;
      const q = gsap.utils.selector(el);
      const assemble = () => art.current?.assemble();

      if (prefersReducedMotion()) {
        gsap.set(q(".js-reveal"), { autoAlpha: 1 });
        assemble();
        return;
      }

      revealHeading(q(`.${styles.title}`)[0] as HTMLElement, { trigger: el, start: "top 55%" });

      const body = q(`.${styles.body}`)[0] as HTMLElement;
      gsap.set(body, { autoAlpha: 1 });
      const lines = SplitText.create(body, { type: "lines", mask: "lines" });

      gsap
        .timeline({ scrollTrigger: { trigger: el, start: "top 55%", once: true } })
        .add(assemble, 0)
        .fromTo(q(`.${styles.index}`), { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.9 }, 0)
        .fromTo(q(`.${styles.artWrap}`), { autoAlpha: 0, scale: 0.94 }, { autoAlpha: 1, scale: 1, duration: 1.4, ease: EASE.expo }, 0)
        .from(lines.lines, { yPercent: 105, duration: 1, stagger: 0.08 }, 0.35)
        .fromTo(
          q(`.${styles.cta}`),
          { autoAlpha: 0, clipPath: "inset(0 100% 0 0)" },
          { autoAlpha: 1, clipPath: "inset(0 0% 0 0)", duration: 0.9, ease: EASE.inOut },
          0.6,
        );
    },
    { scope: card },
  );

  return (
    <article ref={card} className={styles.card} style={{ zIndex: i + 1 }} data-card>
      <div className={styles.inner} data-card-inner>
        <div className={styles.head}>
          <p className={`${styles.index} js-reveal`}>{service.index}</p>
          <h3 className={`${styles.title} js-reveal`}>{service.title}</h3>
        </div>

        <div className={`${styles.artWrap} js-reveal`}>
          <PixelArt
            ref={art}
            art={service.art}
            behavior={service.behavior}
            host={card}
            className={styles.art}
            label={service.label}
          />
        </div>

        <div className={styles.foot}>
          <p className={`${styles.body} js-reveal`}>{service.body}</p>
          <a href={mailto(service)} className={`btn ${styles.cta} js-reveal`}>
            {service.cta} <span className="btn-arrow">→</span>
          </a>
        </div>
        <div className={styles.shade} data-card-shade aria-hidden="true" />
      </div>
    </article>
  );
}

export default function Services() {
  const root = useRef<HTMLElement>(null);

  // Stacking depth: as the next card slides over, the one below sinks back.
  useGSAP(
    () => {
      fadeUp(`.${styles.sub}`, { trigger: root.current!.querySelector(`.${styles.header}`)!, start: "top 85%", delay: 0.45 });
      if (prefersReducedMotion()) return;
      const cards = gsap.utils.toArray<HTMLElement>("[data-card]", root.current);

      cards.forEach((card, i) => {
        const next = cards[i + 1];
        if (!next) return;
        const inner = card.querySelector("[data-card-inner]");
        const shade = card.querySelector("[data-card-shade]");
        gsap
          .timeline({
            scrollTrigger: { trigger: next, start: "top bottom", end: "top top", scrub: true },
          })
          .to(inner, { scale: 0.92, yPercent: -2, ease: "none" }, 0)
          .to(shade, { opacity: 1, ease: "none" }, 0);
      });
      ScrollTrigger.refresh();
    },
    { scope: root },
  );

  return (
    <section ref={root} className={styles.services} aria-labelledby="services-title">
      <header className={styles.header}>
        <Heading className="section-heading" start="top 85%">
          <span id="services-title">Built for real product needs</span>
        </Heading>
        <p className={`section-sub ${styles.sub} js-reveal`}>
          We design brands, interfaces, and product experiences that are clear, modern, and built to
          perform.
        </p>
      </header>
      <div className={styles.stack}>
        {SERVICES.map((s, i) => (
          <ServiceCard key={s.title} service={s} i={i} />
        ))}
      </div>
    </section>
  );
}
