"use client";

import { useRef, useState, type FormEvent } from "react";
import { gsap } from "@/lib/gsap";
import styles from "./ContactPage.module.css";

type Fields = { name: string; email: string; phone: string; company: string; message: string };
type Errors = Partial<Record<keyof Fields, string>>;

const EMPTY: Fields = { name: "", email: "", phone: "", company: "", message: "" };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** The static preview build has no server, so it can't send messages. */
const IS_STATIC_PREVIEW = process.env.NEXT_PUBLIC_STATIC_PREVIEW === "1";

function validate(f: Fields): Errors {
  const e: Errors = {};
  if (!f.name.trim()) e.name = "Please tell us your name.";
  if (!f.email.trim()) e.email = "Please add your email so we can reply.";
  else if (!EMAIL_RE.test(f.email.trim())) e.email = "That email doesn't look right.";
  if (f.phone.trim() && !/^[+()\d\s.-]{6,20}$/.test(f.phone.trim())) e.phone = "Use digits, spaces and + only.";
  if (f.message.trim().length < 10) e.message = "A sentence or two about your project helps us reply properly.";
  return e;
}

/**
 * Contact form. On "Send Message" it posts to /api/contact, which stores the
 * enquiry in a Google Sheet and emails you (see README → Contact form).
 */
export default function ContactForm() {
  const form = useRef<HTMLFormElement>(null);
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [serverError, setServerError] = useState("");
  const honeypot = useRef<HTMLInputElement>(null);

  const set = (k: keyof Fields) => (e: { target: { value: string } }) => {
    setFields((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors((er) => ({ ...er, [k]: undefined }));
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (status === "sending") return;
    const found = validate(fields);
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      form.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    if (IS_STATIC_PREVIEW) {
      setStatus("error");
      setServerError("This preview can't send messages — the form works on the live website.");
      return;
    }
    setStatus("sending");
    setServerError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...fields, website: honeypot.current?.value ?? "" }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || "Something went wrong.");
      setStatus("sent");
      requestAnimationFrame(() => {
        gsap.from(`.${styles.thanks} > *`, { autoAlpha: 0, y: 24, duration: 0.8, stagger: 0.08, ease: "power3.out" });
      });
    } catch (err) {
      setStatus("error");
      setServerError(
        err instanceof Error && err.message !== "Failed to fetch"
          ? err.message
          : "We couldn't send your message. Please try again, or email hello@newview.co.",
      );
    }
  };

  if (status === "sent") {
    return (
      <div className={styles.thanks} role="status">
        <p className={styles.thanksKicker}>Message sent</p>
        <h2 className={styles.thanksTitle}>Thanks, {fields.name.trim().split(" ")[0]}!</h2>
        <p className={styles.thanksText}>
          Your message is with us. We usually reply within one working day at {fields.email.trim()}.
        </p>
        <button
          type="button"
          className={`btn btn--light ${styles.again}`}
          onClick={() => {
            setFields(EMPTY);
            setStatus("idle");
          }}
        >
          Send another message
        </button>
      </div>
    );
  }

  const field = (k: keyof Fields, label: string, placeholder: string, type = "text", auto?: string) => (
    <div className={styles.field} data-field>
      <label htmlFor={`cf-${k}`} className={styles.label}>
        {label}
      </label>
      <input
        id={`cf-${k}`}
        name={k}
        type={type}
        value={fields[k]}
        onChange={set(k)}
        placeholder={placeholder}
        autoComplete={auto}
        aria-invalid={!!errors[k]}
        aria-describedby={errors[k] ? `cf-${k}-err` : undefined}
        className={styles.input}
      />
      {errors[k] && (
        <span id={`cf-${k}-err`} className={styles.error}>
          {errors[k]}
        </span>
      )}
    </div>
  );

  return (
    <form ref={form} className={styles.form} onSubmit={onSubmit} noValidate>
      <div className={styles.fields}>
        {field("name", "Full Name", "Eg: John", "text", "name")}
        <div className={styles.row}>
          {field("email", "Email", "Eg: john@example.com", "email", "email")}
          {field("phone", "Phone Number", "Eg: +123456789", "tel", "tel")}
        </div>
        {field("company", "Company", "Eg: Newview", "text", "organization")}
        <div className={styles.field} data-field>
          <label htmlFor="cf-message" className={styles.label}>
            How can we help?
          </label>
          <textarea
            id="cf-message"
            name="message"
            value={fields.message}
            onChange={set("message")}
            placeholder="Tell us a little about your project, goals, or the challenge you're trying to solve."
            aria-invalid={!!errors.message}
            aria-describedby={errors.message ? "cf-message-err" : undefined}
            className={`${styles.input} ${styles.textarea}`}
            rows={4}
          />
          {errors.message && (
            <span id="cf-message-err" className={styles.error}>
              {errors.message}
            </span>
          )}
        </div>
        {/* Spam trap: hidden from people, often filled in by bots. */}
        <div className={styles.trap} aria-hidden="true">
          <label htmlFor="cf-website">Website</label>
          <input id="cf-website" ref={honeypot} name="website" type="text" tabIndex={-1} autoComplete="off" />
        </div>
      </div>
      <button type="submit" className={`btn btn--light ${styles.send}`} data-field disabled={status === "sending"}>
        {status === "sending" ? "Sending…" : "Send Message"}
      </button>
      {status === "error" && serverError && (
        <p className={styles.formError} role="alert">
          {serverError}
        </p>
      )}
    </form>
  );
}
