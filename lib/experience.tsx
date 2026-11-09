"use client";

import { createContext, useContext } from "react";
import type Lenis from "lenis";

type ExperienceState = {
  /** True once the current page has been revealed (loader or transition). */
  ready: boolean;
  lenis: Lenis | null;
  /** Go to a path (with a pixel page transition) or an in-page anchor. */
  navigate: (href: string, origin?: { x: number; y: number }) => void;
  /** Called by the loader when it starts revealing the landing page. */
  markReady: () => void;
};

export const ExperienceContext = createContext<ExperienceState>({
  ready: false,
  lenis: null,
  navigate: () => {},
  markReady: () => {},
});

export const useExperience = () => useContext(ExperienceContext);

/**
 * Session state that survives client-side page changes: once any page has
 * been revealed, the loading animation never plays again.
 */
export const boot = { done: false };

/** Smooth-scroll to an in-page anchor, falling back to native scrolling. */
export function scrollToTarget(lenis: Lenis | null, target: string, immediate = false) {
  const el = document.querySelector<HTMLElement>(target);
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { duration: 1.6, offset: 0, immediate, force: true });
  else el.scrollIntoView({ behavior: immediate ? "auto" : "smooth" });
}
