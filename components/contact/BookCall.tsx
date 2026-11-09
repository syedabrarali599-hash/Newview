"use client";

import { CONTACT_PAGE } from "@/lib/site";
import { LogoMark } from "../Logo";
import styles from "./ContactPage.module.css";

/**
 * "Book a Free Call" — the white bar with the YOU + New View avatars.
 * Hover: pixels fill it black (as on every CTA), the text turns white and
 * the two avatars move together to "meet".
 */
export default function BookCall({ className = "" }: { className?: string }) {
  return (
    <a href={CONTACT_PAGE.bookingHref} className={`${styles.bookCall} ${className}`} data-pixel-hover>
      <span className={styles.avatars} aria-hidden="true">
        <span className={styles.you}>YOU</span>
        <span className={styles.us}>
          <LogoMark className={styles.usMark} color="#ffffff" />
        </span>
      </span>
      <span className={styles.bookText}>Book a Free Call</span>
    </a>
  );
}
