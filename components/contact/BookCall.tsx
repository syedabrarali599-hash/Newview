"use client";

import { CONTACT_PAGE } from "@/lib/site";
import { LogoMark } from "../Logo";
import styles from "./ContactPage.module.css";

/**
 * "Book a Free Call" — the white bar with the YOU + New View avatars.
 * Hover: pixels fill it black (as on every CTA), the text turns white, the
 * two avatars slide a little apart and a plus appears between them.
 */
export default function BookCall({ className = "" }: { className?: string }) {
  return (
    <a href={CONTACT_PAGE.bookingHref} className={`${styles.bookCall} ${className}`} data-pixel-hover>
      <span className={styles.avatars} aria-hidden="true">
        <span className={styles.you}>YOU</span>
        <svg className={styles.plus} viewBox="0 0 10 10" aria-hidden="true">
          <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" />
        </svg>
        <span className={styles.us}>
          <LogoMark className={styles.usMark} color="#ffffff" />
        </span>
      </span>
      <span className={styles.bookText}>Book a Free Call</span>
    </a>
  );
}
