"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger, prefersReducedMotion } from "@/lib/gsap";
import { ExperienceContext, boot, scrollToTarget } from "@/lib/experience";
import { initPixelHover } from "@/lib/pixelHover";
import { pixelCover, pixelDissolve, whenLoaded } from "@/lib/pixelWipe";
import styles from "./SiteShell.module.css";

type Props = {
  /** Current route path, e.g. "/" or "/contact". */
  pathname: string;
  /** Change route (Next router in the app, simple state in the static build). */
  push: (path: string) => void;
  prefetch?: (path: string) => void;
  children: ReactNode;
};

/**
 * Shared shell for every page: smooth scrolling (Lenis), the pixel page
 * transition, and the "ready" signal pages use to start their intros.
 *
 * - First visit to "/": the landing page's loader reveals it.
 * - First visit to any other page: the screen starts orange and dissolves.
 * - Moving between pages: orange pixels grow from where you clicked to
 *   cover the screen, the next page loads, then the pixels dissolve away.
 *   The loader never plays again.
 */
export default function SiteShell({ pathname, push, prefetch, children }: Props) {
  const [ready, setReady] = useState(false);
  const [lenis, setLenis] = useState<Lenis | null>(null);
  // Every page except the landing page starts under a solid orange cover.
  const [covered, setCovered] = useState(pathname !== "/");
  const canvas = useRef<HTMLCanvasElement>(null);
  const busy = useRef(false);
  const pending = useRef<{ hash: string } | null>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const path = useRef(pathname);
  path.current = pathname;

  // Always start at the top so intros play as designed.
  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => initPixelHover(), []);

  // Lenis drives the scroll; GSAP's ticker drives Lenis so both stay in sync.
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const instance = new Lenis({
      lerp: 0.085,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.1,
      smoothWheel: true,
      anchors: false,
    });
    instance.stop();
    instance.on("scroll", ScrollTrigger.update);
    const raf = (time: number) => instance.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    lenisRef.current = instance;
    setLenis(instance);
    return () => {
      gsap.ticker.remove(raf);
      instance.destroy();
      lenisRef.current = null;
      setLenis(null);
    };
  }, []);

  /** The page is on screen: unlock scrolling and let it start its intro. */
  const markReady = useCallback(() => {
    boot.done = true;
    document.documentElement.classList.remove("is-loading");
    lenisRef.current?.start();
    setReady(true);
    requestAnimationFrame(() => ScrollTrigger.refresh());
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
  }, []);

  /** Dissolve the orange cover (initial load of a sub-page, or after a page change). */
  const reveal = useCallback(async () => {
    const cv = canvas.current;
    if (!cv) return markReady();
    setCovered(false);
    cv.style.visibility = "visible";
    const done = pixelDissolve(cv);
    markReady();
    await done;
    cv.style.visibility = "hidden";
    busy.current = false;
  }, [markReady]);

  // First load of a page other than "/": reveal once fonts and images are in.
  useEffect(() => {
    if (pathname === "/" || boot.done) return;
    let alive = true;
    whenLoaded().then(() => {
      if (alive) void reveal();
    });
    return () => {
      alive = false;
    };
    // Only on first mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navigate = useCallback(
    (href: string, origin?: { x: number; y: number }) => {
      const url = new URL(href, window.location.href);
      const target = url.pathname;
      const hash = url.hash;
      const l = lenisRef.current;

      // Same page: just scroll.
      if (target === path.current) {
        if (hash && hash !== "#top") scrollToTarget(l, hash);
        else if (l) l.scrollTo(0, { duration: 1.6, force: true });
        else window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      if (busy.current) return;
      busy.current = true;
      prefetch?.(target);

      const cv = canvas.current;
      l?.stop();
      const go = () => {
        setReady(false);
        pending.current = { hash };
        push(target);
      };
      if (!cv || prefersReducedMotion()) {
        go();
        return;
      }
      cv.style.visibility = "visible";
      pixelCover(cv, { originX: origin?.x, originY: origin?.y }).then(go);
    },
    [push, prefetch],
  );

  // The new page has rendered: jump to the top (or the anchor), then reveal.
  useEffect(() => {
    if (!pending.current) return;
    const { hash } = pending.current;
    pending.current = null;
    let alive = true;
    const settle = () =>
      new Promise<void>((res) => requestAnimationFrame(() => requestAnimationFrame(() => res())));
    (async () => {
      await settle();
      await Promise.race([document.fonts?.ready ?? Promise.resolve(), new Promise((r) => setTimeout(r, 800))]);
      if (!alive) return;
      window.scrollTo(0, 0);
      lenisRef.current?.scrollTo(0, { immediate: true, force: true });
      ScrollTrigger.refresh();
      if (hash && hash !== "#top") scrollToTarget(lenisRef.current, hash, true);
      await reveal();
    })();
    return () => {
      alive = false;
    };
  }, [pathname, reveal]);

  // Plain links to other pages (e.g. <a href="/contact">) get the transition too.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element).closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target || a.hasAttribute("download")) return;
      const href = a.getAttribute("href") ?? "";
      if (!href.startsWith("/") || href.startsWith("//")) return;
      e.preventDefault();
      navigate(href, { x: e.clientX, y: e.clientY });
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [navigate]);

  const value = useMemo(() => ({ ready, lenis, navigate, markReady }), [ready, lenis, navigate, markReady]);

  return (
    <ExperienceContext.Provider value={value}>
      {children}
      {covered && <div className={styles.cover} data-cover aria-hidden="true" />}
      <canvas ref={canvas} className={styles.wipe} aria-hidden="true" />
    </ExperienceContext.Provider>
  );
}
