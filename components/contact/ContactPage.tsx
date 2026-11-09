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

      gsap
        .timeline({ delay: 0.35 })
        .fromTo(
          q(`.${styles.formCard}`),
          { autoAlpha: 0, y: 60, clipPath: "inset(100% 0 0 0)" },
          { autoAlpha: 1, y: 0, clipPath: "inset(0% 0 0 0)", duration: 1.2, ease: EASE.expo },
        )
        .from(q("[data-field]"), { autoAlpha: 0, y: 18, duration: 0.7, ease: EASE.out, stagger: 0.06 }, "-=0.75");
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

          <div className={`${styles.formCard} js-reveal`}>
            <ContactForm />
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
