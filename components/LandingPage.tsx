"use client";

import { useState } from "react";
import { boot, useExperience } from "@/lib/experience";
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

export default function LandingPage() {
  const { markReady } = useExperience();
  // The loader only plays on the very first visit, never when coming back.
  const [showLoader] = useState(() => !boot.done);

  return (
    <>
      {showLoader && <Loader onReveal={markReady} />}
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
    </>
  );
}
