"use client";

import { useCallback, useRef } from "react";
import { gsap, ScrollTrigger, SplitText, useGSAP, EASE, prefersReducedMotion } from "@/lib/gsap";
import { revealHeading, revealLines } from "@/lib/animations";
import { CONTACT_EMAIL } from "@/lib/site";
import Heading from "./Heading";
import PixelCanvas, { type PixelCanvasHandle, type Scene } from "./PixelCanvas";
import { nib, browser, blocks, megaphone } from "./pixelArt.data";
import styles from "./Services.module.css";

type Service = {
  index: string;
  title: string;
  body: string;
  cta: string;
};

const SERVICES: Service[] = [
  {
    index: "[ 01 ]",
    title: "Brand Identity",
    body: "Logos, visual systems, color, and typography that define how your brand shows up.",
    cta: "Build your brand",
  },
  {
    index: "[ 02 ]",
    title: "Web & App UI Design",
    body: "Clean, modern interfaces designed for clarity, usability, and strong visual impact.",
    cta: "Design your product",
  },
  {
    index: "[ 03 ]",
    title: "Design Systems",
    body: "Scalable components and guidelines that keep your product consistent as it grows.",
    cta: "Scale with a system",
  },
  {
    index: "[ 04 ]",
    title: "Marketing & Creative Assets",
    body: "Landing pages, social visuals, and campaign assets that support launches and day-to-day needs.",
    cta: "Launch a campaign",
  },
];

const ARTS = [nib, browser, blocks, megaphone];

const mailto = (s: Service) =>
  `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`${s.title} project`)}`;

function ServiceCard({ service, i }: { service: Service; i: number }) {
  const card = useRef<HTMLElement>(null);
  const pixels = useRef<PixelCanvasHandle>(null);
  const arts = useRef([ARTS[i]]).current;

  useGSAP(
    () => {
      const el = card.current!;
      const q = gsap.utils.selector(el);
      if (prefersReducedMotion()) {
        gsap.set(q(".js-reveal"), { autoAlpha: 1 });
        pixels.current?.assemble();
        return;
      }

      revealHeading(q(`.${styles.title}`)[0] as HTMLElement, { trigger: el, start: "top 55%" });

      const body = q(`.${styles.body}`)[0] as HTMLElement;
      gsap.set(body, { autoAlpha: 1 });
      const lines = SplitText.create(body, { type: "lines", mask: "lines" });

      gsap
        .timeline({ scrollTrigger: { trigger: el, start: "top 55%", once: true } })
        .add(() => pixels.current?.assemble(), 0)
        .fromTo(q(`.${styles.index}`), { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.9 }, 0)
        .from(lines.lines, { yPercent: 105, duration: 1, stagger: 0.08 }, 0.3)
        .fromTo(
          q(`.${styles.cta}`),
          { autoAlpha: 0, clipPath: "inset(0 100% 0 0)" },
          { autoAlpha: 1, clipPath: "inset(0 0% 0 0)", duration: 0.9, ease: EASE.inOut },
          0.55,
        );
    },
    { scope: card },
  );

  return (
    <article ref={card} className={styles.card} style={{ zIndex: i + 1 }} data-card>
      <div className={styles.inner}>
        <div className={styles.head} data-card-head>
          <p className={`${styles.index} js-reveal`}>{service.index}</p>
          <h3 className={`${styles.title} js-reveal`}>{service.title}</h3>
        </div>
        {/* Small screens: each card carries its own illustration. */}
        <div className={styles.cardArt}>
          <PixelCanvas ref={pixels} arts={arts} host={card} grid className={styles.art} label={service.title} />
        </div>
        <div className={styles.foot} data-card-foot>
          <p className={`${styles.body} js-reveal`}>{service.body}</p>
          <a href={mailto(service)} className={`btn ${styles.cta} js-reveal`}>
            {service.cta} <span className="btn-arrow">→</span>
          </a>
        </div>
      </div>
    </article>
  );
}

export default function Services() {
  const root = useRef<HTMLElement>(null);
  const stack = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const artWrap = useRef<HTMLDivElement>(null);
  const pixels = useRef<PixelCanvasHandle>(null);

  /**
   * The art stays put while the cards stack over each other. While a card is
   * sliding up, its top edge is the "line": the previous art shows above it,
   * the new art below it, with a glitch band in between.
   *
   * Runs every frame, so it works from geometry cached on resize/refresh plus
   * the current scroll position — no layout reads per frame.
   */
  const geo = useRef({ stackTop: 0, stackH: 0, panelH: 1, canvasOffset: 0, count: 4 });
  const measure = useCallback(() => {
    const st = stack.current;
    const cv = artWrap.current?.querySelector("canvas");
    if (!st || !cv || !stage.current) return;
    const stackRect = st.getBoundingClientRect();
    const stageRect = stage.current.getBoundingClientRect();
    const cards = st.querySelectorAll<HTMLElement>("[data-card]");
    geo.current = {
      stackTop: stackRect.top + window.scrollY,
      stackH: st.offsetHeight,
      panelH: cards[0]?.offsetHeight || window.innerHeight,
      canvasOffset: cv.getBoundingClientRect().top - stageRect.top,
      count: cards.length,
    };
  }, []);

  const scene = useCallback((): Scene => {
    const { stackTop, stackH, panelH, canvasOffset, count } = geo.current;
    const y = window.scrollY;
    const stageTop = Math.min(Math.max(stackTop - y, 0), stackTop + stackH - panelH - y);
    const canvasTop = stageTop + canvasOffset;
    let current = 0;
    for (let i = 1; i < count; i++) {
      const top = stackTop + i * panelH - y;
      if (top <= stageTop + 0.5) current = i;
      else if (top < stageTop + panelH) return { a: i - 1, b: i, line: top - canvasTop };
    }
    return { a: current };
  }, []);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      measure();
      ScrollTrigger.addEventListener("refresh", measure);
      const ro = new ResizeObserver(measure);
      if (artWrap.current) ro.observe(artWrap.current);
      revealLines(q(`.${styles.sub}`)[0] as HTMLElement, { trigger: q(`.${styles.header}`)[0] });

      const cleanup = () => {
        ScrollTrigger.removeEventListener("refresh", measure);
        ro.disconnect();
      };
      if (prefersReducedMotion()) {
        ARTS.forEach((_, i) => pixels.current?.assemble(i));
        return cleanup;
      }

      // Each illustration gathers pixel by pixel as its card arrives.
      ScrollTrigger.create({
        trigger: stack.current,
        start: "top 60%",
        once: true,
        onEnter: () => pixels.current?.assemble(0),
      });
      gsap.utils.toArray<HTMLElement>("[data-card]", stack.current).forEach((card, i) => {
        if (i === 0) return;
        ScrollTrigger.create({
          trigger: card,
          start: "top 80%",
          once: true,
          onEnter: () => pixels.current?.assemble(i),
        });
      });

      // As each card slides in, the previous card's copy greys out.
      const cards = gsap.utils.toArray<HTMLElement>("[data-card]", stack.current);
      cards.forEach((card, i) => {
        const prev = cards[i - 1];
        if (!prev) return;
        gsap.to(prev.querySelectorAll("[data-card-head], [data-card-foot]"), {
          opacity: 0.25,
          ease: "none",
          scrollTrigger: { trigger: card, start: "top bottom", end: "top top", scrub: true },
        });
      });

      return cleanup;
    },
    { scope: root },
  );

  return (
    <section ref={root} id="services" className={styles.services} aria-labelledby="services-title">
      <header className={styles.header}>
        <Heading className="section-heading" start="top 85%">
          <span id="services-title">Built for real product needs</span>
        </Heading>
        <p className={`section-sub ${styles.sub} js-reveal`}>
          We design brands, interfaces, and product experiences that are clear, modern, and built to
          perform.
        </p>
      </header>

      <div ref={stack} className={styles.stack}>
        <div className={styles.stageTrack}>
          <div ref={stage} className={styles.stage}>
            <div ref={artWrap} className={styles.artWrap}>
              <PixelCanvas
                ref={pixels}
                arts={ARTS}
                host={stack}
                grid
                scene={scene}
                className={styles.art}
                label="Pixel illustrations for each service: a pen nib, a browser window, design-system tiles and a megaphone"
              />
            </div>
          </div>
        </div>
        {SERVICES.map((s, i) => (
          <ServiceCard key={s.title} service={s} i={i} />
        ))}
      </div>
    </section>
  );
}
