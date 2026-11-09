"use client";

import { useRef } from "react";
import { gsap, SplitText, useGSAP, EASE, prefersReducedMotion } from "@/lib/gsap";
import { useExperience } from "@/lib/experience";
import { CONTACT_PAGE } from "@/lib/site";
import Heading from "../Heading";
import Footer from "../Footer";
import { LogoMark } from "../Logo";
import BookCall from "./BookCall";
import ContactForm from "./ContactForm";
import StackGame from "./StackGame";
import { MailIcon, PhoneIcon, WhatsAppIcon } from "./icons";
import styles from "./ContactPage.module.css";

const CHANNELS = [
  { label: "Phone Call", value: CONTACT_PAGE.phone, href: CONTACT_PAGE.phoneHref, Icon: PhoneIcon, area: "phone" },
  { label: "Whatsapp", value: CONTACT_PAGE.phone, href: CONTACT_PAGE.whatsappHref, Icon: WhatsAppIcon, area: "whatsapp" },
  { label: "Email", value: CONTACT_PAGE.email, href: CONTACT_PAGE.emailHref, Icon: MailIcon, area: "email" },
] as const;

/** The soft white shape inside the form card (Figma vector, exported as-is). */
function FormShine() {
  return (
    <svg className={styles.formShine} viewBox="0 0 888 796" fill="none" aria-hidden="true">
      <g opacity="0.16">
        <g filter="url(#cf-shine-inner)">
          <path
            d="M276.83 610.629H387.057C566.077 610.629 655.588 610.628 723.471 574.717C778.252 545.738 823.051 500.979 852.056 446.246C887.999 378.423 888 288.991 888 110.13V0L276.83 610.629Z"
            fill="white"
            fillOpacity="0.2"
          />
          <path
            d="M611.17 185.371H500.943C321.923 185.371 232.412 185.372 164.529 221.283C109.748 250.262 64.9491 295.021 35.9439 349.754C0.00145765 417.577 1.65341e-10 507.009 0 685.87V796L611.17 185.371Z"
            fill="white"
            fillOpacity="0.2"
          />
        </g>
        <path
          d="M500.942 185.871H609.961L0.5 794.793V685.87C0.5 596.431 0.501215 529.382 4.99219 476.215C9.48263 423.054 18.4593 383.816 36.3857 349.988C65.3439 295.345 110.071 250.657 164.763 221.725C198.62 203.814 237.893 194.845 291.102 190.358C344.316 185.871 411.424 185.871 500.942 185.871ZM887.5 110.13C887.5 199.569 887.499 266.618 883.008 319.785C878.517 372.946 869.541 412.184 851.614 446.012C822.656 500.655 777.93 545.343 723.237 574.275C689.38 592.186 650.107 601.155 596.898 605.642C543.684 610.129 476.576 610.13 387.058 610.13H278.038L887.5 1.20605V110.13Z"
          stroke="white"
          strokeOpacity="0.4"
        />
      </g>
      <defs>
        {/* Inner shadow: 4px 16px 20px #fff @ 22% */}
        <filter id="cf-shine-inner" x="0" y="0" width="892" height="812" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
          <feOffset dx="4" dy="16" />
          <feGaussianBlur stdDeviation="10" />
          <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
          <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.22 0" />
          <feBlend mode="normal" in2="shape" result="effect1_innerShadow" />
        </filter>
      </defs>
    </svg>
  );
}

export default function ContactPage() {
  const { ready } = useExperience();
  const root = useRef<HTMLDivElement>(null);

  // Intro, in the same voice as the landing page: header drops in, the
  // heading reveals word by word, copy rises line by line, then the rest.
  useGSAP(
    () => {
      if (!ready) return;
      const q = gsap.utils.selector(root);
      if (prefersReducedMotion()) {
        gsap.set(q(".js-reveal"), { autoAlpha: 1 });
        return;
      }
      gsap.fromTo(
        q(`.${styles.header}`),
        { yPercent: -130, autoAlpha: 0 },
        { yPercent: 0, autoAlpha: 1, duration: 1.2, ease: EASE.expo, delay: 0.1 },
      );

      const copy = q(`.${styles.copy}`)[0] as HTMLElement;
      gsap.set(copy, { autoAlpha: 1 });
      const lines = SplitText.create(copy, { type: "lines", mask: "lines" });

      gsap
        .timeline({ delay: 0.45 })
        .from(lines.lines, { yPercent: 105, duration: 1, ease: EASE.out, stagger: 0.08 })
        .fromTo(q(`.${styles.rule}`), { scaleX: 0 }, { scaleX: 1, duration: 1, ease: EASE.inOut }, "-=0.7")
        .fromTo(
          q(`.${styles.bookCall}`),
          { autoAlpha: 0, clipPath: "inset(0 100% 0 0)" },
          { autoAlpha: 1, clipPath: "inset(0 0% 0 0)", duration: 0.9, ease: EASE.inOut },
          "-=0.75",
        )
        .fromTo(
          q(`.${styles.channel}`),
          { autoAlpha: 0, y: 24 },
          { autoAlpha: 1, y: 0, duration: 0.8, ease: EASE.out, stagger: 0.08 },
          "-=0.5",
        );

      // The card wipes up, its corner handles pop on, then the fields rise.
      gsap.set(q(`.${styles.formFrame}`), { autoAlpha: 1 });
      gsap
        .timeline({ delay: 0.35 })
        .fromTo(
          q(`.${styles.formCard}`),
          { autoAlpha: 0, y: 60, clipPath: "inset(100% 0 0 0)" },
          // clipPath is cleared after so the card's outside stroke isn't cut off.
          { autoAlpha: 1, y: 0, clipPath: "inset(0% 0 0 0)", duration: 1.2, ease: EASE.expo, clearProps: "clipPath" },
        )
        .from(
          q(`.${styles.handle}`),
          { autoAlpha: 0, scale: 0, duration: 0.5, ease: "back.out(2.2)", stagger: 0.06 },
          "-=0.45",
        )
        .from(q("[data-field]"), { autoAlpha: 0, y: 18, duration: 0.7, ease: EASE.out, stagger: 0.06 }, "<-0.2");
    },
    { dependencies: [ready], scope: root },
  );

  return (
    <div ref={root} className={styles.page}>
      <header className={`${styles.header} js-reveal`}>
        <a href="/" className={styles.brand} aria-label="New View — home">
          <LogoMark className={styles.mark} />
          <span className={styles.word}>New View</span>
        </a>
        <a href="/" className={styles.home}>
          <span className={styles.homeText}>&lt; Home</span>
        </a>
      </header>

      <main>
        <section className={styles.hero} aria-labelledby="contact-title">
          <div className={styles.intro}>
            <Heading as="h1" className={styles.title} immediate play={ready} delay={0.2}>
              <span id="contact-title">Let&apos;s Connect</span>
            </Heading>
            <p className={`${styles.copy} js-reveal`}>
              Have a project in mind, a challenge to solve, or an idea you&apos;d like to explore? We&apos;d love to
              hear more.
            </p>
            <hr className={styles.rule} />
            <BookCall className="js-reveal" />
            <ul className={styles.channels}>
              {CHANNELS.map(({ label, value, href, Icon, area }) => (
                <li key={area} className={`${styles.channel} js-reveal`} style={{ gridArea: area }}>
                  <a href={href} className={styles.channelLink} target={area === "whatsapp" ? "_blank" : undefined} rel="noreferrer">
                    <span className={styles.channelIcon}>
                      <Icon />
                    </span>
                    <span className={styles.channelText}>
                      <span className={styles.channelLabel}>{label}</span>
                      <span className={styles.channelValue}>{value}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className={`${styles.formFrame} js-reveal`}>
            <div className={styles.formCard}>
              <FormShine />
              <ContactForm />
            </div>
            {(["tl", "tr", "bl", "br"] as const).map((pos) => (
              <i key={pos} className={styles.handle} data-pos={pos} aria-hidden="true" />
            ))}
          </div>
        </section>

        <section className={styles.gameSection} aria-label="Pixel Stack game">
          <StackGame />
        </section>
      </main>

      <Footer />
    </div>
  );
}
