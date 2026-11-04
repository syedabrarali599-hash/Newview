"use client";

import { createContext, useContext } from "react";
import type Lenis from "lenis";

type ExperienceState = {
  /** True once the loader has started revealing the page. */
  ready: boolean;
  lenis: Lenis | null;
};

export const ExperienceContext = createContext<ExperienceState>({
  ready: false,
  lenis: null,
});

export const useExperience = () => useContext(ExperienceContext);

/** Smooth-scroll to an in-page anchor, falling back to native scrolling. */
export function scrollToTarget(lenis: Lenis | null, target: string) {
  const el = document.querySelector<HTMLElement>(target);
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { duration: 1.6, offset: 0 });
  else el.scrollIntoView({ behavior: "smooth" });
}
