"use client";

import { useCallback, useEffect, useState } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger, prefersReducedMotion } from "@/lib/gsap";
import { ExperienceContext } from "@/lib/experience";
import { initPixelHover } from "@/lib/pixelHover";
import { initSoundEvents, unlockAudio } from "@/lib/sound";
import Loader from "./Loader";
import Nav from "./Nav";
import Hero from "./Hero";
import About from "./About";
import Services from "./Services";
import Work from "./Work";
import Process from "./Process";
import GettingStarted from "./GettingStarted";
import Different from "./Different";
import Testimonials from "./Testimonials";
import Cta from "./Cta";
import Footer from "./Footer";

export default function Experience() {
  const [ready, setReady] = useState(false);
  const [lenis, setLenis] = useState<Lenis | null>(null);

  // Always start at the top so the intro sequence plays as designed.
  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
  }, []);

  // Pixel-fill hover on every CTA, and hover/click sounds across the page.
  useEffect(() => initPixelHover(), []);
  useEffect(() => initSoundEvents(), []);

  // Browsers allow sound only after a click, tap or key press.
  useEffect(() => {
    const unlock = () => unlockAudio();
    const opts = { capture: true, passive: true } as const;
    window.addEventListener("pointerdown", unlock, opts);
    window.addEventListener("keydown", unlock, opts);
    return () => {
      window.removeEventListener("pointerdown", unlock, opts);
      window.removeEventListener("keydown", unlock, opts);
    };
  }, []);

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
    setLenis(instance);

    return () => {
      gsap.ticker.remove(raf);
      instance.destroy();
      setLenis(null);
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.classList.remove("is-loading");
    lenis?.start();
    // Layout changes once scrolling is unlocked and fonts have settled.
    const id = requestAnimationFrame(() => ScrollTrigger.refresh());
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(id);
  }, [ready, lenis]);

  const handleReveal = useCallback(() => setReady(true), []);

  return (
    <ExperienceContext.Provider value={{ ready, lenis }}>
      <Loader onReveal={handleReveal} />
      <Nav />
      <main>
        <Hero />
        <About />
        <Services />
        <Work />
        <Process />
        <GettingStarted />
        <Different />
        <Testimonials />
        <Cta />
      </main>
      <Footer />
    </ExperienceContext.Provider>
  );
}
