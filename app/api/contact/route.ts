import { NextResponse } from "next/server";

/**
 * POST /api/contact — receives the contact form, validates it and forwards it
 * to a Google Apps Script web app that (1) adds a row to your Google Sheet
 * and (2) emails you. See integrations/google-apps-script/contact-form.gs
 * and README → "Contact form" for the 5-minute setup.
 *
 * Environment variables (Vercel → Project → Settings → Environment Variables):
 *   CONTACT_WEBHOOK_URL     the Apps Script web app URL (ends in /exec)
 *   CONTACT_WEBHOOK_SECRET  any long random string, also pasted into the script
 */

export const runtime = "nodejs";

const LIMITS = { name: 120, email: 200, phone: 40, company: 160, message: 5000 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Very small per-instance rate limit: 5 messages per IP per 10 minutes.
const hits = new Map<string, number[]>();
function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60 * 1000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 5;
}

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  // Spam trap: real people never fill this hidden field. Pretend it worked.
  if (typeof body.website === "string" && body.website.trim()) {
    return NextResponse.json({ ok: true });
  }

  const data = {
    name: clean(body.name, LIMITS.name),
    email: clean(body.email, LIMITS.email),
    phone: clean(body.phone, LIMITS.phone),
    company: clean(body.company, LIMITS.company),
    message: clean(body.message, LIMITS.message),
  };
  if (!data.name || !EMAIL_RE.test(data.email) || data.message.length < 10) {
    return NextResponse.json({ ok: false, error: "Please fill in your name, a valid email and a short message." }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json({ ok: false, error: "Too many messages — please try again in a few minutes." }, { status: 429 });
  }

  const url = process.env.CONTACT_WEBHOOK_URL;
  if (!url) {
    console.error("CONTACT_WEBHOOK_URL is not set — contact form submissions cannot be delivered.");
    return NextResponse.json(
      { ok: false, error: "The contact form isn't connected yet. Please email hello@newview.co." },
      { status: 503 },
    );
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        secret: process.env.CONTACT_WEBHOOK_SECRET ?? "",
        source: req.headers.get("referer") ?? "",
        submittedAt: new Date().toISOString(),
      }),
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });
    const result = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (!res.ok || !result?.ok) {
      console.error("Contact webhook failed", res.status, result?.error);
      throw new Error("webhook");
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, error: "We couldn't send your message. Please try again, or email hello@newview.co." },
      { status: 502 },
    );
  }
}
