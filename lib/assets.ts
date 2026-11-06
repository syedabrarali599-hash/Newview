// Every image the site uses lives in /resources/images and is imported here,
// so the bundler fingerprints and serves it. Use these URLs in components.
// (Full-size source files are kept in /resources/images/originals.)
import heroGlasses from "@/resources/images/hero-glasses.webp";
import cursorPurple from "@/resources/images/cursor-purple.webp";
import cursorYellow from "@/resources/images/cursor-yellow.webp";
import logoMark from "@/resources/images/logo-mark.svg";
import workAgentic from "@/resources/images/work/agentic.webp";
import workOqualem from "@/resources/images/work/oqualem.webp";
import workSeeneemaa from "@/resources/images/work/seeneemaa.webp";
import workPhone from "@/resources/images/work/phone.webp";

// Next.js gives image imports as { src, width, height }; the static build
// (esbuild) gives a plain URL string. Normalise both to a URL.
type ImageImport = string | { src: string };
const url = (img: ImageImport) => (typeof img === "string" ? img : img.src);

export const ASSETS = {
  heroGlasses: url(heroGlasses),
  cursorPurple: url(cursorPurple),
  cursorYellow: url(cursorYellow),
  logoMark: url(logoMark),
  work: {
    agentic: url(workAgentic),
    oqualem: url(workOqualem),
    seeneemaa: url(workSeeneemaa),
    phone: url(workPhone),
  },
};
