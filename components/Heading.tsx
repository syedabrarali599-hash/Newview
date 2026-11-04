"use client";

import { useRef, type ElementType, type ReactNode } from "react";
import { useGSAP } from "@/lib/gsap";
import { revealHeading } from "@/lib/animations";

type Props = {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  /** Play right away instead of on scroll (used by the hero). */
  immediate?: boolean;
  /** Gate the animation until something else (e.g. the loader) is done. */
  play?: boolean;
  delay?: number;
  start?: string;
};

/** Section heading with the shared word-by-word reveal. */
export default function Heading({
  as: Tag = "h2",
  children,
  className,
  immediate,
  play = true,
  delay,
  start,
}: Props) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!play || !ref.current) return;
      revealHeading(ref.current, { immediate, delay, start });
    },
    { dependencies: [play], scope: ref },
  );

  return (
    <Tag ref={ref} className={["js-reveal", className].filter(Boolean).join(" ")}>
      {children}
    </Tag>
  );
}
