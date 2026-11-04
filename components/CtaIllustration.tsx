"use client";

import { useRef, useState } from "react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import styles from "./Cta.module.css";

const INK = "#220d04";
const YELLOW = "#ffd400";
const ORANGE = "#e85313";

/**
 * "Idea → wireframe → final design". Interactive:
 *  - the white cursor follows yours around the illustration
 *  - the bulb glows brighter as you get close, click it to flick the idea on/off
 *  - each window drifts with a little depth parallax
 *  - hover the final design and the sun rises
 */
export default function CtaIllustration() {
  const root = useRef<SVGSVGElement>(null);
  const [on, setOn] = useState(true);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const svg = root.current!;
      const q = gsap.utils.selector(svg);
      const cursor = q("[data-cursor]")[0];
      const glow = q("[data-glow]")[0];
      const layers = q("[data-depth]").map((el) => ({
        depth: Number(el.getAttribute("data-depth")),
        x: gsap.quickTo(el, "x", { duration: 1, ease: "power3.out" }),
        y: gsap.quickTo(el, "y", { duration: 1, ease: "power3.out" }),
      }));
      const cx = gsap.quickTo(cursor, "x", { duration: 0.7, ease: "power3.out" });
      const cy = gsap.quickTo(cursor, "y", { duration: 0.7, ease: "power3.out" });
      const glowTo = gsap.quickTo(glow, "opacity", { duration: 0.5, ease: "power2.out" });

      const toSvg = (e: PointerEvent) => {
        const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM()!.inverse());
        return pt;
      };

      const host = svg.closest("[data-cta]") as HTMLElement;
      const onMove = (e: PointerEvent) => {
        const p = toSvg(e);
        // Cursor tip home is at (86, 214); move it towards the pointer.
        cx(gsap.utils.clamp(-80, 560, p.x - 86));
        cy(gsap.utils.clamp(-200, 100, p.y - 214));
        const nx = p.x / 657 - 0.5;
        const ny = p.y / 328 - 0.5;
        layers.forEach((l) => {
          l.x(nx * l.depth * 22);
          l.y(ny * l.depth * 14);
        });
        const d = Math.hypot(p.x - 120, p.y - 120);
        glowTo(gsap.utils.clamp(0.25, 1, 1.2 - d / 260));
      };
      const onLeave = () => {
        cx(0);
        cy(0);
        layers.forEach((l) => {
          l.x(0);
          l.y(0);
        });
        glowTo(0.45);
      };
      host.addEventListener("pointermove", onMove);
      host.addEventListener("pointerleave", onLeave);
      return () => {
        host.removeEventListener("pointermove", onMove);
        host.removeEventListener("pointerleave", onLeave);
      };
    },
    { scope: root },
  );

  return (
    <svg
      ref={root}
      viewBox="0 0 657 328"
      className={styles.illo}
      data-on={on}
      role="img"
      aria-label="An idea lightbulb flowing into a wireframe and then a finished design"
    >
      {/* Sparkles */}
      <g className={styles.pop}>
        <rect x="30" y="70" width="10" height="10" fill={YELLOW} className={styles.twinkle} />
        <rect x="610" y="58" width="10" height="10" fill={YELLOW} className={styles.twinkle} />
        <rect x="236" y="250" width="8" height="8" fill="#fff" className={styles.twinkle} />
        <path d="M630 236l4 10 10 4-10 4-4 10-4-10-10-4 10-4z" fill={YELLOW} stroke={INK} strokeWidth="3" className={styles.twinkle} />
        <path d="M604 20l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="#fff" stroke={INK} strokeWidth="2.5" className={styles.twinkle} />
      </g>

      {/* Bulb */}
      <g data-depth="1.4" className={styles.pop}>
        <g className={styles.bulb} onClick={() => setOn((v) => !v)} style={{ cursor: "pointer" }}>
          <circle data-glow cx="120" cy="120" r="78" fill={YELLOW} opacity="0.45" className={styles.glow} />
          <g className={styles.bulbRays} stroke={YELLOW} strokeWidth="9" strokeLinecap="square">
            <path d="M120 30v-14" />
            <path d="M58 56 48 46" />
            <path d="M182 56l10-10" />
            <path d="M36 120H22" />
            <path d="M204 120h14" />
            <path d="M62 178l-10 10" />
            <path d="M178 178l10 10" />
          </g>
          <path
            d="M120 58c-34 0-58 26-58 56 0 20 10 34 24 46 6 5 8 12 8 20v6h52v-6c0-8 2-15 8-20 14-12 24-26 24-46 0-30-24-56-58-56Z"
            className={styles.bulbGlass}
            stroke={INK}
            strokeWidth="7"
            strokeLinejoin="round"
          />
          <path d="M104 150l16-20 16 20M120 130v56" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity="0.65" />
          <rect x="94" y="186" width="52" height="14" rx="3" fill="#cfcfcf" stroke={INK} strokeWidth="6" />
          <rect x="100" y="200" width="40" height="12" rx="3" fill="#a9a9a9" stroke={INK} strokeWidth="6" />
          <path d="M86 92c4-10 12-16 22-18" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" />
        </g>
      </g>

      {/* Flow arrows */}
      <g className={styles.pop}>
        <path d="M206 160h52" className={styles.flow} stroke="#fff" strokeWidth="6" strokeLinecap="round" fill="none" />
        <path d="M250 150l12 10-12 10" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M424 160h34" className={styles.flow} stroke="#fff" strokeWidth="6" strokeLinecap="round" fill="none" />
        <path d="M450 150l12 10-12 10" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>

      {/* Wireframe window */}
      <g data-depth="0.8" className={styles.pop}>
        <g className={styles.win}>
          <rect x="272" y="96" width="144" height="128" rx="6" fill="#fff" stroke={INK} strokeWidth="7" />
          <path d="M272 120h144" stroke={INK} strokeWidth="6" />
          <circle cx="286" cy="108" r="4" fill={INK} />
          <circle cx="299" cy="108" r="4" fill={INK} />
          <circle cx="312" cy="108" r="4" fill={INK} />
          <rect x="284" y="134" width="70" height="52" fill="none" stroke={INK} strokeWidth="5" strokeDasharray="6 5" />
          <path d="M290 180l16-18 12 12 8-8 16 14" fill="none" stroke={INK} strokeWidth="4.5" strokeLinejoin="round" />
          <circle cx="338" cy="148" r="5" fill={INK} />
          <rect x="364" y="134" width="40" height="12" fill={ORANGE} stroke={INK} strokeWidth="4" />
          <rect x="364" y="154" width="40" height="12" fill="#fff" stroke={INK} strokeWidth="4" />
          <rect x="364" y="174" width="40" height="12" fill="#fff" stroke={INK} strokeWidth="4" />
          <path d="M284 202h60M284 212h40" stroke={INK} strokeWidth="4" strokeLinecap="round" />
        </g>
      </g>

      {/* Final window */}
      <g data-depth="1.1" className={styles.pop}>
        <g className={`${styles.win} ${styles.final}`}>
          <rect x="470" y="84" width="160" height="148" rx="6" fill="#fff" stroke={INK} strokeWidth="7" />
          <path d="M470 110h160" stroke={INK} strokeWidth="6" />
          <circle cx="484" cy="97" r="4" fill={INK} />
          <circle cx="497" cy="97" r="4" fill={INK} />
          <circle cx="510" cy="97" r="4" fill={INK} />
          <clipPath id="ctaImg">
            <rect x="484" y="124" width="132" height="66" />
          </clipPath>
          <g clipPath="url(#ctaImg)">
            <rect x="484" y="124" width="132" height="66" fill={YELLOW} />
            <circle className={styles.sun} cx="590" cy="146" r="10" fill="#fff" />
            <path d="M484 190l34-38 22 24 16-14 40 28Z" fill={ORANGE} stroke={INK} strokeWidth="4.5" strokeLinejoin="round" />
          </g>
          <rect x="484" y="124" width="132" height="66" fill="none" stroke={INK} strokeWidth="5" />
          <rect x="484" y="200" width="58" height="18" rx="2" fill={ORANGE} stroke={INK} strokeWidth="4" />
          <path d="M556 206h50M556 214h34" stroke={INK} strokeWidth="4" strokeLinecap="round" />
        </g>
        {/* Little yellow cursor clicking the final design */}
        <path
          className={styles.click}
          d="M604 214l30 12-13 4 9 14-7 4-9-14-10 9Z"
          fill={YELLOW}
          stroke={INK}
          strokeWidth="4"
          strokeLinejoin="round"
        />
      </g>

      {/* Your cursor */}
      <g data-cursor className={styles.pop}>
        <path d="M86 214 120 256l-18 2 10 22-10 5-10-22-13 12Z" fill="#fff" stroke={INK} strokeWidth="5" strokeLinejoin="round" transform="rotate(-24 86 214)" />
      </g>
    </svg>
  );
}
