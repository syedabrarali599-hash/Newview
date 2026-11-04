"use client";

import { useRef } from "react";
import { gsap, ScrollTrigger, useGSAP, EASE } from "@/lib/gsap";
import { scrollToTarget, useExperience } from "@/lib/experience";
import { LogoMark } from "./Logo";
import styles from "./Nav.module.css";

const LINKS = [
  { label: "Home", href: "#top" },
  { label: "About", href: "#about" },
  { label: "Work", href: "#work" },
];

export default function Nav() {
  const { ready, lenis } = useExperience();
  const ref = useRef<HTMLElement>(null);

  // Intro: the bar drops in from above once the loader clears.
  useGSAP(
    () => {
      if (!ready) return;
      gsap.fromTo(
        ref.current,
        { yPercent: -130, autoAlpha: 0 },
        { yPercent: 0, autoAlpha: 1, duration: 1.3, ease: EASE.expo, delay: 0.15 },
      );
      gsap.from(`.${styles.link}`, {
        y: -18,
        autoAlpha: 0,
        duration: 1,
        ease: EASE.out,
        stagger: 0.08,
        delay: 0.45,
      });
    },
    { dependencies: [ready], scope: ref },
  );

  // Tuck the bar away while scrolling down, bring it back on scroll up.
  useGSAP(
    () => {
      if (!ready) return;
      const el = ref.current!;
      const hide = gsap.quickTo(el, "yPercent", { duration: 0.6, ease: "power3.out" });
      ScrollTrigger.create({
        start: 0,
        end: "max",
        onUpdate(self) {
          const y = self.scroll();
          el.dataset.scrolled = y > 40 ? "true" : "false";
          if (y < 120) hide(0);
          else hide(self.direction === 1 ? -130 : 0);
        },
      });
    },
    { dependencies: [ready] },
  );

  const go = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    if (href === "#top") {
      if (lenis) lenis.scrollTo(0, { duration: 1.6 });
      else window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    scrollToTarget(lenis, href);
  };

  return (
    <header ref={ref} className={`${styles.nav} js-reveal`} data-scrolled="false">
      <a href="#top" className={styles.brand} onClick={(e) => go(e, "#top")} aria-label="New View — home">
        <LogoMark className={styles.mark} />
        <span className={styles.word}>New View</span>
      </a>
      <nav aria-label="Primary">
        <ul className={styles.links}>
          {LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} className={styles.link} onClick={(e) => go(e, l.href)}>
                <span className={styles.linkText}>
                  {l.label}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
