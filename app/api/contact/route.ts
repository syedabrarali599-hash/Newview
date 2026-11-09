import { NextResponse } from "next/server";

/**
 * POST /api/contact — receives the contact form, validates it and forwards it
 * to a Google Apps Script web app that (1) adds a row to your Google Sheet
 * and (2) emails you. See integrations/google-apps-script/contact-form.gs
 * and README → "Contact form" for the 5-minute setup.
 *
 * GET /api/contact — checks the connection to the script and explains in
 * plain words what to fix, if anything. Open it in a browser after setup.
 *
 * Environment variables (Vercel → Project → Settings → Environment Variables):
 *   CONTACT_WEBHOOK_URL     the Apps Script web app URL (ends in /exec)
 *   CONTACT_WEBHOOK_SECRET  any long random string, also pasted into the script
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LIMITS = { name: 120, email: 200, phone: 40, company: 160, message: 5000 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SCRIPT_URL_RE = /^https:\/\/script\.google\.com\/(?:a\/macros\/[^/]+|macros)\/s\/[^/]+\/(exec|dev)\/?$/;

// Very small per-instance rate limit: 5 requests per IP per 10 minutes.
const hits = new Map<string, number[]>();
function rateLimited(key: string) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < 10 * 60 * 1000);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > 5;
}

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const clientIp = (req: Request) => req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

type ScriptReply = { ok?: boolean; error?: string; script?: string; pong?: boolean };
type CallResult = { status: number; reply: ScriptReply | null; text: string; networkError?: string };

/** Calls the Apps Script web app (it answers through a redirect, which fetch follows). */
async function callScript(url: string, init?: { body: Record<string, unknown> }): Promise<CallResult> {
  try {
    const res = await fetch(url, {
      method: init ? "POST" : "GET",
      headers: init ? { "Content-Type": "application/json" } : undefined,
      body: init ? JSON.stringify(init.body) : undefined,
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    const text = await res.text().catch(() => "");
    let reply: ScriptReply | null = null;
    try {
      reply = JSON.parse(text) as ScriptReply;
    } catch {
      /* Google sent a web page instead of the script's JSON */
    }
    return { status: res.status, reply, text };
  } catch (err) {
    return { status: 0, reply: null, text: "", networkError: err instanceof Error ? err.message : String(err) };
  }
}

/** Turns a failed call into a plain-English fix. */
function explain(r: CallResult): string {
  if (r.networkError) return `Couldn't reach Google (${r.networkError}). Check CONTACT_WEBHOOK_URL is the full web app URL.`;
  if (r.reply?.error === "unauthorised")
    return "The secret doesn't match. CONTACT_WEBHOOK_SECRET in Vercel must be exactly the same as SECRET in the script (no extra spaces), and after editing the script you must publish a new version: Deploy → Manage deployments → ✎ Edit → Version: New version → Deploy. Redeploy on Vercel after changing the variable.";
  if (r.reply?.error) return `The script ran but reported an error: ${r.reply.error}. In the script editor, run "testSetup" once and allow the permissions.`;
  const page = r.text;
  if (/accounts\.google\.com|ServiceLogin|Sign in/i.test(page))
    return 'Google asked for a sign-in, so the web app isn\'t public. In the script: Deploy → Manage deployments → ✎ Edit → "Who has access": Anyone (not "Anyone with a Google account") → Deploy.';
  if (/Authori[sz]ation is required/i.test(page))
    return 'The script needs permission. In the script editor pick "testSetup", click Run and allow the permissions, then publish a new version (Deploy → Manage deployments → ✎ Edit → New version).';
  if (/Script function not found/i.test(page))
    return "The deployed script is an older version. Paste the latest contact-form.gs into the editor, Save, then Deploy → Manage deployments → ✎ Edit → Version: New version → Deploy.";
  if (r.status === 404) return "Google says the script wasn't found. Copy the Web app URL again from Deploy → Manage deployments.";
  const snippet = page.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160);
  return `Google answered with HTTP ${r.status} instead of the script's reply${snippet ? `: "${snippet}"` : ""}.`;
}

function failed() {
  return NextResponse.json(
    { ok: false, error: "We couldn't send your message. Please try again, or email hello@newview.co." },
    { status: 502 },
  );
}

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

  if (rateLimited(clientIp(req))) {
    return NextResponse.json({ ok: false, error: "Too many messages — please try again in a few minutes." }, { status: 429 });
  }

  const url = process.env.CONTACT_WEBHOOK_URL?.trim();
  if (!url) {
    console.error("[contact] CONTACT_WEBHOOK_URL is not set — contact form submissions cannot be delivered.");
    return NextResponse.json(
      { ok: false, error: "The contact form isn't connected yet. Please email hello@newview.co." },
      { status: 503 },
    );
  }

  const r = await callScript(url, {
    body: {
      ...data,
      secret: process.env.CONTACT_WEBHOOK_SECRET?.trim() ?? "",
      source: req.headers.get("referer") ?? "",
      submittedAt: new Date().toISOString(),
    },
  });
  if (r.reply?.ok) return NextResponse.json({ ok: true });

  // The visitor sees a friendly message; the real reason goes to the Vercel logs.
  console.error(`[contact] Delivery failed (HTTP ${r.status}). ${explain(r)}`);
  return failed();
}

/** Connection check: open /api/contact in a browser. Nothing is saved or emailed. */
export async function GET(req: Request) {
  const report = (ok: boolean, message: string) =>
    new NextResponse(JSON.stringify({ ok, message }, null, 2), {
      status: ok ? 200 : 500,
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
    });

  if (rateLimited(`check:${clientIp(req)}`)) return report(false, "Too many checks — try again in a few minutes.");

  const url = process.env.CONTACT_WEBHOOK_URL?.trim();
  const secret = process.env.CONTACT_WEBHOOK_SECRET?.trim();
  if (!url)
    return report(false, "CONTACT_WEBHOOK_URL isn't set for this deployment. Add it in Vercel → Settings → Environment Variables (tick Production and Preview), then redeploy.");
  const shape = url.match(SCRIPT_URL_RE);
  if (!shape)
    return report(false, "CONTACT_WEBHOOK_URL doesn't look like an Apps Script web app URL. It should look like https://script.google.com/macros/s/…/exec — copy it from Deploy → Manage deployments.");
  if (shape[1] === "dev")
    return report(false, "CONTACT_WEBHOOK_URL ends in /dev, which only works while you're signed in to Google. Use the Web app URL that ends in /exec.");
  if (!secret) return report(false, "CONTACT_WEBHOOK_SECRET isn't set for this deployment. Add it in Vercel (same value as SECRET in the script), then redeploy.");

  // 1. Is the web app public and running the current script?
  const hello = await callScript(url);
  if (hello.reply?.script !== "new-view-contact") return report(false, explain(hello));

  // 2. Does the secret match? (A "ping" saves nothing.)
  const ping = await callScript(url, { body: { action: "ping", secret } });
  if (!ping.reply?.pong) return report(false, explain(ping));

  return report(true, "Connected. Messages from the contact form will be saved to your Google Sheet (and emailed, if NOTIFY_EMAIL is set in the script).");
}
