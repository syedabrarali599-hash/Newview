"use client";

import { useRef } from "react";
import { gsap, useGSAP, EASE, prefersReducedMotion } from "@/lib/gsap";
import { scrollToTarget, useExperience } from "@/lib/experience";
import { CONTACT_EMAIL, CONTACT_HREF, CONTACT_PHONE } from "@/lib/site";
import styles from "./Footer.module.css";

const NAV = [
  { label: "Home", href: "#top" },
  { label: "About", href: "#about" },
  { label: "Work", href: "#work" },
  { label: "Resources", href: "#work" },
];

const SOCIALS = [
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/",
    d: "M6.94 8.5H3.56V20h3.38V8.5ZM5.25 3a1.96 1.96 0 1 0 0 3.92 1.96 1.96 0 0 0 0-3.92ZM20.44 13.4c0-3.1-1.66-4.54-3.87-4.54a3.34 3.34 0 0 0-3.02 1.66V8.5h-3.38V20h3.38v-5.69c0-1.5.28-2.95 2.14-2.95 1.83 0 1.86 1.71 1.86 3.05V20h3.38l-.49-6.6Z",
  },
  {
    label: "X",
    href: "https://x.com/",
    d: "M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.2L2 3h6.33l4.37 5.77L17.75 3Zm-1.08 16.17h1.7L7.4 4.74H5.58l11.09 14.43Z",
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/",
    d: "M12 7.2a4.8 4.8 0 1 0 0 9.6 4.8 4.8 0 0 0 0-9.6Zm0 7.9a3.1 3.1 0 1 1 0-6.2 3.1 3.1 0 0 1 0 6.2ZM17 5.9a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2ZM12 3.7c2.7 0 3 0 4.1.06 2.7.12 4 1.42 4.1 4.1.06 1.06.06 1.38.06 4.1s0 3.04-.06 4.1c-.12 2.68-1.4 3.98-4.1 4.1-1.06.06-1.38.06-4.1.06s-3.04 0-4.1-.06c-2.72-.12-3.98-1.43-4.1-4.1C3.74 15 3.72 14.7 3.72 12s0-3.04.06-4.1c.12-2.68 1.4-3.98 4.1-4.1C8.96 3.7 9.3 3.7 12 3.7ZM12 2c-2.72 0-3.06 0-4.12.06-3.64.17-5.65 2.18-5.82 5.82C2 8.94 2 9.28 2 12s0 3.06.06 4.12c.17 3.63 2.18 5.65 5.82 5.82C8.94 22 9.28 22 12 22s3.06 0 4.12-.06c3.63-.17 5.65-2.18 5.82-5.82.06-1.06.06-1.4.06-4.12s0-3.06-.06-4.12c-.16-3.63-2.18-5.65-5.82-5.82C15.06 2 14.72 2 12 2Z",
  },
  {
    label: "Facebook",
    href: "https://www.facebook.com/",
    d: "M13.5 21v-7.5h2.53l.38-2.94H13.5V8.69c0-.85.24-1.43 1.46-1.43h1.55V4.64c-.27-.04-1.19-.12-2.26-.12-2.24 0-3.77 1.37-3.77 3.88v2.16H7.95v2.94h2.53V21h3.02Z",
  },
];

export default function Footer() {
  const root = useRef<HTMLElement>(null);
  const { lenis } = useExperience();

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.from(`.${styles.col}`, {
        autoAlpha: 0,
        y: 30,
        duration: 1,
        ease: EASE.out,
        stagger: 0.12,
        scrollTrigger: { trigger: root.current, start: "top 92%", once: true },
      });
    },
    { scope: root },
  );

  const go = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    if (href === "#top") {
      if (lenis) lenis.scrollTo(0, { duration: 2 });
      else window.scrollTo({ top: 0, behavior: "smooth" });
    } else scrollToTarget(lenis, href);
  };

  return (
    <footer ref={root} className={styles.footer}>
      <div className={`${styles.col} ${styles.about}`}>
        <p className={styles.tagline}>
          Every pixel has a purpose. We craft brands and digital experiences that are clear,
          memorable, and thoughtfully designed for lasting success.
        </p>
        <a href={CONTACT_HREF} className={`btn ${styles.grow}`}>
          Let&apos;s Grow Your Brand <span className="btn-arrow">→</span>
        </a>
      </div>

      <nav className={styles.col} aria-label="Footer">
        <p className={styles.colTitle}>Navigation</p>
        <ul className={styles.list}>
          {NAV.map((n) => (
            <li key={n.label}>
              <a href={n.href} className={styles.link} onClick={(e) => go(e, n.href)}>
                {n.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className={styles.col}>
        <p className={styles.colTitle}>Contact</p>
        <ul className={styles.list}>
          <li>
            <a href={`tel:${CONTACT_PHONE.replace(/[^+\d]/g, "")}`} className={styles.link}>
              {CONTACT_PHONE}
            </a>
          </li>
          <li>
            <a href={`mailto:${CONTACT_EMAIL}`} className={styles.link}>
              {CONTACT_EMAIL}
            </a>
          </li>
        </ul>
        <ul className={styles.socials}>
          {SOCIALS.map((s) => (
            <li key={s.label}>
              <a href={s.href} className={styles.social} aria-label={s.label} target="_blank" rel="noreferrer">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                  <path d={s.d} />
                </svg>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
