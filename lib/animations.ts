"use client";

import { gsap, SplitText, EASE, prefersReducedMotion } from "./gsap";

type HeadingOptions = {
  /** Start immediately (hero) instead of waiting for the element to scroll in. */
  immediate?: boolean;
  delay?: number;
  start?: string;
  /** Override the element that triggers the scroll animation. */
  trigger?: Element;
};

/**
 * The signature "Apple style" heading reveal used on every section heading:
 * words rise a touch, sharpen from a blur and fade from 0 → 100% opacity,
 * one after another.
 */
export function revealHeading(el: HTMLElement, opts: HeadingOptions = {}) {
  if (prefersReducedMotion()) {
    gsap.set(el, { autoAlpha: 1 });
    return null;
  }

  const split = SplitText.create(el, { type: "words", wordsClass: "split-word" });
  gsap.set(el, { autoAlpha: 1 });

  const tween = gsap.fromTo(
    split.words,
    { autoAlpha: 0, yPercent: 38, filter: "blur(12px)" },
    {
      autoAlpha: 1,
      yPercent: 0,
      filter: "blur(0px)",
      duration: 1.25,
      ease: EASE.out,
      stagger: 0.085,
      delay: opts.delay ?? 0,
      scrollTrigger: opts.immediate
        ? undefined
        : {
            trigger: opts.trigger ?? el,
            start: opts.start ?? "top 85%",
            once: true,
          },
      onComplete: () => {
        // Drop the blur filter so text stays perfectly crisp afterwards.
        gsap.set(split.words, { clearProps: "filter" });
      },
    },
  );

  return { split, tween };
}

/** A soft fade-up used for body copy, buttons and cards. */
export function fadeUp(
  targets: gsap.TweenTarget,
  vars: gsap.TweenVars & { trigger?: Element; start?: string } = {},
) {
  const { trigger, start, ...rest } = vars;
  if (prefersReducedMotion()) {
    gsap.set(targets, { autoAlpha: 1 });
    return null;
  }
  return gsap.fromTo(
    targets,
    { autoAlpha: 0, y: 40 },
    {
      autoAlpha: 1,
      y: 0,
      duration: 1.1,
      ease: EASE.out,
      ...rest,
      scrollTrigger: trigger
        ? { trigger, start: start ?? "top 82%", once: true }
        : undefined,
    },
  );
}
