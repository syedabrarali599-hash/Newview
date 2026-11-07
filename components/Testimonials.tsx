"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, useGSAP, EASE, prefersReducedMotion } from "@/lib/gsap";
import Heading from "./Heading";
import styles from "./Testimonials.module.css";

const QUOTES = [
  {
    quote:
      "This is going to be the beginning of a beautiful relationship… complete with tracking numbers without having even asked. Nice touch. Much obliged.",
    name: "Marcus H.",
    role: "Operations Manager",
  },
  {
    quote:
      "We rely on New View for hard-to-find parts and fast response times. Their team keeps projects moving without surprises.",
    name: "Maya R.",
    role: "Supply Chain Lead",
  },
  {
    quote:
      "New View made the procurement process smooth and transparent. Every request was handled with urgency and professionalism.",
    name: "Angie F.",
    role: "Purchasing",
  },
];

function QuoteMark() {
  return (
    <svg viewBox="0 0 100 76" className={styles.mark} aria-hidden="true">
      <path
        d="M0 0h44v40c0 20-10 32-30 36l-4-12c10-3 14-9 14-18H0Zm56 0h44v40c0 20-10 32-30 36l-4-12c10-3 14-9 14-18H56Z"
        fill="#ffd6c4"
      />
    </svg>
  );
}

export default function Testimonials() {
  const root = useRef<HTMLElement>(null);
  const track = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);
  const [scrollable, setScrollable] = useState(false);

  useGSAP(
    () => {
      const cards = gsap.utils.toArray<HTMLElement>(`.${styles.card}`, root.current);
      if (prefersReducedMotion()) {
        gsap.set([...cards, `.${styles.dots}`], { autoAlpha: 1 });
        return;
      }
      gsap
        .timeline({ scrollTrigger: { trigger: track.current, start: "top 85%", once: true } })
        .fromTo(cards, { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 1.1, ease: EASE.out, stagger: 0.12 })
        .from(
          `.${styles.mark}`,
          { scale: 0.6, autoAlpha: 0, transformOrigin: "100% 100%", duration: 0.8, ease: "back.out(2)", stagger: 0.12 },
          "-=0.8",
        )
        .fromTo(`.${styles.dots}`, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6 }, "-=0.4");
    },
    { scope: root },
  );

  // Dots follow the track on small screens, where the cards scroll sideways.
  useEffect(() => {
    const el = track.current!;
    const measure = () => setScrollable(el.scrollWidth > el.clientWidth + 4);
    const onScroll = () => {
      const card = el.firstElementChild as HTMLElement | null;
      if (!card) return;
      setActive(Math.round(el.scrollLeft / (card.offsetWidth + 20)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", onScroll);
    };
  }, []);

  const goTo = (i: number) => {
    const el = track.current!;
    const card = el.children[i] as HTMLElement | undefined;
    if (card) el.scrollTo({ left: card.offsetLeft - el.offsetLeft, behavior: "smooth" });
  };

  return (
    <section ref={root} id="testimonials" className={styles.section} aria-labelledby="testimonials-title">
      <Heading className={`section-heading ${styles.heading}`}>
        <span id="testimonials-title">
          The work matters.
          <br />
          So does working together.
        </span>
      </Heading>

      <ul ref={track} className={styles.track}>
        {QUOTES.map((q) => (
          <li key={q.name} className={`${styles.card} js-reveal`}>
            <blockquote className={styles.quote}>{q.quote}</blockquote>
            <div className={styles.person}>
              <p className={styles.name}>{q.name}</p>
              <p className={styles.role}>{q.role}</p>
            </div>
            <QuoteMark />
          </li>
        ))}
      </ul>

      <div className={`${styles.dots} js-reveal`} data-scrollable={scrollable}>
        {QUOTES.map((q, i) => (
          <button
            key={q.name}
            type="button"
            className={styles.dot}
            data-active={(scrollable ? active : 0) === i}
            aria-label={`Show testimonial ${i + 1}`}
            onClick={() => goTo(i)}
          />
        ))}
      </div>
    </section>
  );
}
