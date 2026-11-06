"use client";

import { useEffect, useRef } from "react";
import { gsap, useGSAP, EASE, prefersReducedMotion } from "@/lib/gsap";
import styles from "./HeroPlayground.module.css";

const DESIGN_W = 1336;
const CELL = 19; // grid cell size in the design (px at 1336 wide)
const TRAIL_COLOR = "#e85313"; // brand orange

type Cell = { life: number };
type Ripple = { x: number; y: number; t: number };

/**
 * The interactive frame under the hero headline.
 *  - the pixel grid lights up along the cursor path (and ripples on click)
 *  - the glasses tilt in 3D towards the cursor with a moving lens shine
 *  - move close to one of the two pixel cursors and it becomes your cursor
 *    (only one at a time; the other stays where it is)
 */
export default function HeroPlayground({ play }: { play: boolean }) {
  const frame = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const glasses = useRef<HTMLDivElement>(null);
  const shine = useRef<HTMLDivElement>(null);
  const cursorA = useRef<HTMLDivElement>(null);
  const cursorB = useRef<HTMLDivElement>(null);
  const floatTweens = useRef<gsap.core.Tween[]>([]);

  // ---------- Pixel trail canvas ----------
  useEffect(() => {
    const el = frame.current!;
    const cv = canvas.current!;
    const ctx = cv.getContext("2d")!;
    const reduced = prefersReducedMotion();
    const cells = new Map<number, Cell>();
    const ripples: Ripple[] = [];
    let cols = 0;
    let rows = 0;
    let size = 0;
    let dpr = 1;
    let last: { x: number; y: number } | null = null;
    let visible = true;
    let idleTimer = 0;
    let pointerInside = false;

    const resize = () => {
      const r = el.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      size = (r.width / DESIGN_W) * CELL;
      cols = Math.ceil(r.width / size);
      rows = Math.ceil(r.height / size);
      cv.width = Math.round(r.width * dpr);
      cv.height = Math.round(r.height * dpr);
      cv.style.width = `${r.width}px`;
      cv.style.height = `${r.height}px`;
    };

    const light = (cx: number, cy: number, life = 1) => {
      if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) return;
      const key = cy * cols + cx;
      const existing = cells.get(key);
      if (existing && existing.life > life) return;
      cells.set(key, { life });
    };

    const paintSegment = (x0: number, y0: number, x1: number, y1: number) => {
      const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / (size * 0.5)));
      for (let i = 0; i <= steps; i++) {
        const x = x0 + ((x1 - x0) * i) / steps;
        const y = y0 + ((y1 - y0) * i) / steps;
        light(Math.floor(x / size), Math.floor(y / size));
      }
    };

    const local = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    const onMove = (e: PointerEvent) => {
      pointerInside = true;
      const p = local(e);
      if (last) paintSegment(last.x, last.y, p.x, p.y);
      else light(Math.floor(p.x / size), Math.floor(p.y / size));
      last = p;
    };
    const onLeave = () => {
      last = null;
      pointerInside = false;
    };
    const onDown = (e: PointerEvent) => {
      const p = local(e);
      ripples.push({ x: p.x / size, y: p.y / size, t: 0 });
    };

    const tick = (_: number, deltaMs: number) => {
      if (!visible) return;
      const dt = Math.min(deltaMs, 50) / 1000;

      // Ambient twinkle so the grid feels alive even before you touch it.
      idleTimer += dt;
      if (!pointerInside && idleTimer > 0.22 && !reduced) {
        idleTimer = 0;
        light(Math.floor(Math.random() * cols), Math.floor(Math.random() * rows), 0.55);
      }

      for (let i = ripples.length - 1; i >= 0; i--) {
        const rp = ripples[i];
        rp.t += dt;
        const radius = rp.t * 22;
        const samples = Math.max(12, Math.floor(radius * 7));
        for (let s = 0; s < samples; s++) {
          const a = (s / samples) * Math.PI * 2;
          light(Math.floor(rp.x + Math.cos(a) * radius), Math.floor(rp.y + Math.sin(a) * radius), 0.85);
        }
        if (radius > Math.max(cols, rows)) ripples.splice(i, 1);
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.fillStyle = TRAIL_COLOR;
      for (const [key, cell] of cells) {
        cell.life -= dt * 1.25;
        if (cell.life <= 0) {
          cells.delete(key);
          continue;
        }
        const x = (key % cols) * size;
        const y = Math.floor(key / cols) * size;
        ctx.globalAlpha = Math.pow(cell.life, 1.6) * 0.85;
        ctx.fillRect(x + 0.5, y + 0.5, size - 1, size - 1);
      }
      ctx.globalAlpha = 1;
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    const io = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting));
    io.observe(el);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("pointerdown", onDown);
    gsap.ticker.add(tick);

    return () => {
      gsap.ticker.remove(tick);
      ro.disconnect();
      io.disconnect();
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("pointerdown", onDown);
    };
  }, []);

  // ---------- Glasses tilt + "become the cursor" ----------
  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const el = frame.current!;
      const g = glasses.current!;
      gsap.set(g, { transformPerspective: 1100 });

      const gx = gsap.quickTo(g, "x", { duration: 1, ease: "power3.out" });
      const gy = gsap.quickTo(g, "y", { duration: 1, ease: "power3.out" });
      const rx = gsap.quickTo(g, "rotationX", { duration: 1.2, ease: "power3.out" });
      const ry = gsap.quickTo(g, "rotationY", { duration: 1.2, ease: "power3.out" });
      const sh = gsap.quickTo(shine.current, "--shine", { duration: 1.1, ease: "power3.out" });

      // Each pixel cursor's arrow tip sits ~31% of the image width from its
      // centre, along the direction the cursor art is rotated (from Figma).
      const cursors = [
        { el: cursorA.current!, angle: -31.54 },
        { el: cursorB.current!, angle: -160.77 },
      ].map((c) => ({ ...c, x: 0, y: 0, tx: 0, ty: 0, speed: 6 }));

      const homeTip = (c: (typeof cursors)[number]) => {
        const float = c.el.querySelector<HTMLElement>("[data-float]")!;
        const img = float.querySelector("img")!;
        const cx = c.el.offsetLeft + float.offsetLeft + img.offsetWidth / 2;
        const cy = c.el.offsetTop + float.offsetTop + img.offsetHeight / 2;
        const a = (c.angle * Math.PI) / 180;
        const r = img.offsetWidth * 0.309;
        return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
      };

      let captured: (typeof cursors)[number] | null = null;
      const floats = cursors.map((c) => c.el.querySelector<HTMLElement>("[data-float]")!);

      const capture = (c: (typeof cursors)[number] | null) => {
        if (captured === c) return;
        if (captured) {
          captured.tx = 0;
          captured.ty = 0;
          captured.speed = 5;
          captured.el.dataset.captured = "false";
        }
        captured = c;
        el.dataset.capturing = c ? "true" : "false";
        if (c) {
          c.speed = 22;
          c.el.dataset.captured = "true";
        }
        // The captured cursor stops bobbing so its tip sits exactly on yours.
        floats.forEach((f, i) => {
          const idle = floatTweens.current[i];
          if (cursors[i] === c) {
            idle?.pause();
            gsap.to(f, { y: 0, rotation: 0, duration: 0.2 });
          } else idle?.play();
        });
      };

      const onMove = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        const px = e.clientX - r.left;
        const py = e.clientY - r.top;
        const nx = px / r.width - 0.5;
        const ny = py / r.height - 0.5;

        gx(nx * 36);
        gy(ny * 22);
        ry(nx * 16);
        rx(-ny * 12);
        sh((nx + 0.5) * 100);

        // Which cursor is the pointer heading for?
        const radius = Math.max(70, (150 * r.width) / DESIGN_W);
        const near = cursors
          .map((c) => {
            const t = homeTip(c);
            return { c, t, d: Math.hypot(px - t.x, py - t.y) };
          })
          .sort((a, b) => a.d - b.d);
        const other = near.find((n) => n.c !== captured);
        if (!captured && near[0].d < radius) capture(near[0].c);
        else if (captured && other && other.d < radius) capture(other.c);

        if (captured) {
          const t = homeTip(captured);
          captured.tx = px - t.x;
          captured.ty = py - t.y;
        }
      };

      const onLeave = () => {
        gx(0);
        gy(0);
        rx(0);
        ry(0);
        sh(30);
        capture(null);
      };

      const tick = (_: number, deltaMs: number) => {
        const dt = Math.min(deltaMs, 50) / 1000;
        for (const c of cursors) {
          const k = 1 - Math.exp(-dt * c.speed);
          c.x += (c.tx - c.x) * k;
          c.y += (c.ty - c.y) * k;
          gsap.set(c.el, { x: c.x, y: c.y });
        }
      };

      gsap.ticker.add(tick);
      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerleave", onLeave);
      return () => {
        gsap.ticker.remove(tick);
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerleave", onLeave);
      };
    },
    { scope: frame },
  );

  // ---------- Intro ----------
  useGSAP(
    () => {
      if (!play) return;
      const q = gsap.utils.selector(frame);
      if (prefersReducedMotion()) {
        gsap.set([frame.current, ...q(".js-reveal")], { autoAlpha: 1 });
        return;
      }
      const tl = gsap.timeline({ delay: 0.7 });
      tl.fromTo(
        frame.current,
        { autoAlpha: 0, y: 70 },
        { autoAlpha: 1, y: 0, duration: 1.5, ease: EASE.expo },
      )
        .fromTo(
          q(`.${styles.grid}`),
          { clipPath: "inset(0 0 100% 0)" },
          { clipPath: "inset(0 0 0% 0)", duration: 1.6, ease: EASE.inOut },
          "<",
        )
        .fromTo(
          q(`.${styles.glassesInner}`),
          { autoAlpha: 0, scale: 0.86, y: 40, filter: "blur(14px)" },
          { autoAlpha: 1, scale: 1, y: 0, filter: "blur(0px)", duration: 1.4, ease: EASE.expo },
          "-=1.05",
        )
        .fromTo(
          q(`.${styles.cursorInner}`),
          { autoAlpha: 0, x: (i: number) => (i === 0 ? 160 : -160), y: (i: number) => (i === 0 ? -90 : 90) },
          { autoAlpha: 1, x: 0, y: 0, duration: 1.3, ease: EASE.expo, stagger: 0.12 },
          "-=1",
        )
        .fromTo(
          q(`.${styles.tag}`),
          { autoAlpha: 0, scale: 0.6 },
          { autoAlpha: 1, scale: 1, duration: 0.6, ease: "back.out(2)", stagger: 0.1 },
          "-=0.5",
        );

      // Gentle idle float on the cursors (paused while one is "yours").
      floatTweens.current = q(`.${styles.cursorFloat}`).map((c, i) =>
        gsap.to(c, {
          delay: 2.2,
          y: i ? -8 : 8,
          rotation: i ? -3 : 3,
          duration: 2.4 + i * 0.4,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        }),
      );
    },
    { dependencies: [play], scope: frame },
  );

  return (
    <div ref={frame} className={`${styles.frame} js-reveal`}>
      <div className={styles.grid} aria-hidden="true" />
      <canvas ref={canvas} className={styles.canvas} aria-hidden="true" />

      <div ref={glasses} className={styles.glasses}>
        <div className={styles.glassesInner}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="assets/hero-glasses.png"
            alt="Pixel-art sunglasses: one lens shows a grey landscape, the other a bright sunny one — a new view."
            width={1838}
            height={856}
            draggable={false}
            fetchPriority="high"
          />
          <div
            ref={shine}
            className={styles.shine}
            style={{ WebkitMaskImage: "url(assets/hero-glasses.png)", maskImage: "url(assets/hero-glasses.png)" }}
            aria-hidden="true"
          />
        </div>
      </div>

      <div ref={cursorA} className={`${styles.cursor} ${styles.cursorPurple}`} aria-hidden="true">
        <div className={`${styles.cursorInner} js-reveal`}>
          <div className={styles.cursorFloat} data-float>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="assets/cursor-purple.png" alt="" draggable={false} />
          </div>
          <span className={`${styles.tag} ${styles.tagPurple}`}>Designer</span>
        </div>
      </div>
      <div ref={cursorB} className={`${styles.cursor} ${styles.cursorYellow}`} aria-hidden="true">
        <div className={`${styles.cursorInner} js-reveal`}>
          <div className={styles.cursorFloat} data-float>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="assets/cursor-yellow.png" alt="" draggable={false} />
          </div>
          <span className={`${styles.tag} ${styles.tagYellow}`}>Product team</span>
        </div>
      </div>

      <p className={styles.hint} aria-hidden="true">
        Move &amp; click to play
      </p>
    </div>
  );
}
