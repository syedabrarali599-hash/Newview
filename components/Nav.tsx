"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, ScrollTrigger, useGSAP, EASE } from "@/lib/gsap";
import { scrollToTarget, useExperience } from "@/lib/experience";
import { LogoMark } from "./Logo";
import styles from "./Nav.module.css";

/** The essentials only; every other section is a scroll away. */
export const NAV_LINKS = [
  { label: "Home", href: "#top" },
  { label: "About", href: "#about" },
  { label: "Services", href: "#services" },
  { label: "Work", href: "#work" },
  { label: "Contact", href: "#contact" },
];

export default function Nav() {
  const { ready, lenis } = useExperience();
  const ref = useRef<HTMLElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState("#top");
  const [open, setOpen] = useState(false);

  // Intro: the bar drops in from above once the loader clears.
  useGSAP(
    () => {
      if (!ready) return;
      gsap.fromTo(
        ref.current,
        { yPercent: -130, autoAlpha: 0 },
        { yPercent: 0, autoAlpha: 1, duration: 1.3, ease: EASE.expo, delay: 0.15 },
      );
      gsap.from(`.${styles.links} .${styles.link}, .${styles.menuBtn}`, {
        y: -18,
        autoAlpha: 0,
        duration: 1,
        ease: EASE.out,
        stagger: 0.05,
        delay: 0.45,
      });
    },
    { dependencies: [ready], scope: ref },
  );

  // Tuck the bar away while scrolling down, bring it back on scroll up, and
  // highlight the link for the section in view.
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
      NAV_LINKS.forEach(({ href }) => {
        const section = document.querySelector(href);
        if (!section) return;
        ScrollTrigger.create({
          trigger: section,
          start: "top 45%",
          end: "bottom 45%",
          onToggle: (self) => setActive((prev) => (self.isActive ? href : prev === href ? "" : prev)),
        });
      });
    },
    { dependencies: [ready] },
  );

  // Full-screen menu on small screens.
  useEffect(() => {
    if (!menu.current) return;
    const items = menu.current.querySelectorAll(`.${styles.menuLink}`);
    if (open) {
      lenis?.stop();
      gsap.set(menu.current, { display: "flex" });
      gsap.fromTo(menu.current, { clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0% 0)", duration: 0.7, ease: EASE.inOut });
      gsap.fromTo(items, { yPercent: 110, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.7, stagger: 0.05, delay: 0.25, ease: EASE.out });
    } else {
      lenis?.start();
      gsap.to(menu.current, {
        clipPath: "inset(0 0 100% 0)",
        duration: 0.55,
        ease: EASE.inOut,
        onComplete: () => {
          if (menu.current) gsap.set(menu.current, { display: "none" });
        },
      });
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, lenis]);

  const go = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setOpen(false);
    // Let the menu start closing before the page glides away.
    const run = () => {
      if (href === "#top") {
        if (lenis) lenis.scrollTo(0, { duration: 1.6, force: true });
        else window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      scrollToTarget(lenis, href);
    };
    if (open) setTimeout(run, 120);
    else run();
  };

  return (
    <>
    <header ref={ref} className={`${styles.nav} js-reveal`} data-scrolled="false" data-open={open}>
      <a href="#top" className={styles.brand} onClick={(e) => go(e, "#top")} aria-label="New View — home">
        <LogoMark className={styles.mark} />
        <span className={styles.word}>New View</span>
      </a>

      <nav aria-label="Primary" className={styles.desktop}>
        <ul className={styles.links}>
          {NAV_LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className={styles.link}
                data-active={active === l.href}
                aria-current={active === l.href ? "true" : undefined}
                onClick={(e) => go(e, l.href)}
              >
                <span className={styles.linkText}>{l.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <button
        type="button"
        className={styles.menuBtn}
        aria-expanded={open}
        aria-controls="site-menu"
        onClick={() => setOpen((v) => !v)}
      >
        <span>{open ? "Close" : "Menu"}</span>
        <span className={styles.burger} aria-hidden="true" />
      </button>
    </header>

      <div ref={menu} id="site-menu" className={styles.menu} style={{ display: "none" }}>
        <ul>
          {NAV_LINKS.map((l, i) => (
            <li key={l.href} className={styles.menuItem}>
              <a href={l.href} className={styles.menuLink} data-active={active === l.href} onClick={(e) => go(e, l.href)}>
                <span className={styles.menuNum}>[ {String(i + 1).padStart(2, "0")} ]</span>
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
