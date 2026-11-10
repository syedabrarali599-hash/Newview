#!/usr/bin/env node
/**
 * Keeps memory.md's conversation log up to date.
 *
 * Run at the end of every Claude reply (CLAUDE.md asks for this; it can also
 * be wired up as a Claude Code Stop hook with --hook, which passes the session
 * details on stdin). It reads the session transcript, appends any new
 * turns (what you wrote + Claude's final reply) to the log in memory.md, and,
 * on a feature branch, commits and pushes memory.md so it survives the cloud
 * container being reset. It never commits on main/master and never touches
 * any other file.
 *
 * Manual run:   node scripts/memory/update-memory.mjs [--transcript <file.jsonl>] [--no-git]
 *               (without --transcript it uses this project's newest session)
 * Hide a turn:  node scripts/memory/update-memory.mjs --hide-last [--message-only]
 *               adds the newest turn to memory/private-turns.txt — run it in the
 *               same reply, before the hook pushes the log.
 *
 * Privacy (this repo is public):
 *  - email addresses (other than @newview.co) and token-like strings are masked;
 *  - memory/private-turns.txt lists turn ids to hide: "<id>" hides the whole
 *    turn; "<id> message-only" hides what you wrote and drops any sentence
 *    about tokens from Claude's reply;
 *  - asides in brackets are dropped from Claude's multiple-choice questions.
 *  Older turns are never rewritten, so hand edits stick.
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const MEMORY = path.join(ROOT, "memory.md");
const PRIVATE_LIST = path.join(ROOT, "memory", "private-turns.txt");
const START = "<!-- memory-log:start -->";
const END = "<!-- memory-log:end -->";
const REWRITABLE = 2; // the newest turns may still be finishing, so they're refreshed

// ---------- input ----------
const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
let transcript = flag("--transcript");
let sessionId = flag("--session");
const useGit = !args.includes("--no-git");

// The Stop hook passes the session details as JSON on stdin.
if (!transcript && args.includes("--hook")) {
  try {
    const hook = JSON.parse(fs.readFileSync(0, "utf8") || "{}");
    transcript = hook.transcript_path;
    sessionId = sessionId || hook.session_id;
  } catch {
    /* no hook input */
  }
}

// Otherwise use the newest Claude Code transcript for this folder.
if (!transcript) {
  const dir = path.join(process.env.HOME || "", ".claude", "projects", ROOT.replace(/[^A-Za-z0-9]/g, "-"));
  try {
    transcript = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".jsonl"))
      .map((f) => path.join(dir, f))
      .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];
  } catch {
    /* no transcripts here */
  }
}
if (!transcript || !fs.existsSync(transcript) || !fs.existsSync(MEMORY)) process.exit(0);

// ---------- privacy ----------
const privateTurns = new Map(
  (fs.existsSync(PRIVATE_LIST) ? fs.readFileSync(PRIVATE_LIST, "utf8").split("\n") : [])
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const [id, mode] = l.split(/\s+/);
      return [id, mode === "message-only" ? "message-only" : "all"];
    }),
);

/** Drops every sentence that mentions a token or secret; empty paragraphs go too. */
const withoutTokenTalk = (text) =>
  text
    .split(/\n{2,}/)
    .map((para) =>
      para
        .split("\n")
        .map((line) =>
          line
            .split(/(?<=[.!?])\s+/)
            .filter((sentence) => !/token|secret/i.test(sentence))
            .join(" "),
        )
        .filter((line) => line.trim())
        .join("\n"),
    )
    .filter((para) => para.trim() && !/^\*\*[^*]+:\*\*$/.test(para.trim()))
    .join("\n\n");

const mask = (text) =>
  text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, (m) => (/@newview\.co$/i.test(m) ? m : "[email removed]"))
    .replace(/\b(?:figd|ghp|gho|github_pat|sk|xox[abp]|AKIA)[_-][A-Za-z0-9_-]{12,}\b/g, "[secret removed]")
    .replace(/\bprj_[A-Za-z0-9]{16,}\b/g, "[id removed]");

// ---------- transcript → turns ----------
const HARNESS = [
  /^This session is being continued from a previous conversation/,
  /^This session's worker process was restarted/,
  /^Tool loaded\.?$/,
  /^Caveat: /,
  /^<(?:local-command|command-|task-notification|bash-|user-memory)/,
];

function userText(content) {
  const parts = [];
  let images = 0;
  const blocks = typeof content === "string" ? [{ type: "text", text: content }] : content || [];
  for (const b of blocks) {
    if (b.type === "tool_result") return null; // tool output, not something the user wrote
    if (b.type === "image") images++;
    if (b.type === "text") parts.push(b.text);
  }
  let text = parts
    .join("\n")
    .replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, "")
    .replace(/<\/?pasted_content[^>]*>/g, "")
    .replace(/\[Image: source: [^\]]*\]/g, "")
    .replace(/@"?\/root\/\.claude\/uploads\/[^/\s"]+\/(?:[0-9a-f]{8}-)?([^"\n]+?)"?(?=\s|$)/g, "_(file attached: $1)_")
    .trim();
  if (!text && !images) return null;
  if (images) text = `${text}${text ? "\n\n" : ""}_(${images === 1 ? "a screenshot was" : `${images} screenshots were`} attached)_`;
  return text;
}

function readTurns(file) {
  const turns = [];
  let turn = null;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    if (!line.trim()) continue;
    let d;
    try {
      d = JSON.parse(line);
    } catch {
      continue;
    }
    if (d.isSidechain || d.isMeta || d.isCompactSummary || d.isApiErrorMessage) continue;
    if (d.type === "user") {
      // Answers to Claude's multiple-choice questions arrive as tool results.
      if (turn && Array.isArray(d.message?.content)) {
        for (const b of d.message.content) {
          if (b.type !== "tool_result") continue;
          const raw = typeof b.content === "string" ? b.content : (b.content || []).map((c) => c.text || "").join("\n");
          if (!/questions have been answered|answered your questions/i.test(raw)) continue;
          for (const m of raw.matchAll(/"((?:[^"\\]|\\.)*)"="((?:[^"\\]|\\.)*)"/g)) turn.answers.push({ q: m[1], a: m[2] });
        }
      }
      const text = userText(d.message?.content);
      if (text == null) continue;
      if (/^\[Request interrupted by user/.test(text)) {
        if (turn) turn.interrupted = true;
        continue;
      }
      if (HARNESS.some((re) => re.test(text))) continue;
      if (turn && turn.user === text) continue; // the same message sent twice
      turn = { id: d.uuid, at: d.timestamp, session: d.sessionId, user: text, events: [], answers: [] };
      turns.push(turn);
    } else if (d.type === "assistant" && turn) {
      for (const b of d.message?.content || []) {
        if (b.type === "text" && b.text.trim()) turn.events.push({ text: b.text.trim() });
        else if (b.type === "tool_use") turn.events.push({ tool: true });
      }
    }
  }
  for (const t of turns) {
    const lastTool = t.events.map((e) => !!e.tool).lastIndexOf(true);
    let reply = t.events.slice(lastTool + 1).filter((e) => e.text).map((e) => e.text);
    if (!reply.length) reply = t.events.filter((e) => e.text).slice(-1).map((e) => e.text);
    t.reply = reply.join("\n\n");
  }
  return turns;
}

// ---------- rendering ----------
const when = (iso) => {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${d.toLocaleString("en-GB", { month: "short", timeZone: "UTC" })} ${d.getUTCFullYear()}, ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")} UTC`;
};
const quote = (text) =>
  text
    .split("\n")
    .map((l) => (l ? `> ${l}` : ">"))
    .join("\n");

function render(turn) {
  let t = turn;
  const head = `<!-- turn:${t.id} -->\n**You** · ${when(t.at)}\n\n`;
  const privacy = privateTurns.get(t.id);
  if (privacy === "all") return `${head}_A private exchange was left out of this public log._\n`;
  let reply = t.reply ? mask(t.reply) : "_(no written reply)_";
  if (privacy === "message-only") {
    t = { ...t, user: "_(This message was left out of the public log.)_", answers: [] };
    reply = withoutTokenTalk(reply);
  }
  const cut = t.interrupted ? "\n\n_(interrupted)_" : "";
  const aside = (q) => q.replace(/\s*\([^)]*\)/g, "");
  const asked = t.answers.map((x) => `**Claude asked:** ${mask(aside(x.q))}\n**You chose:** ${mask(x.a)}`).join("\n\n");
  return `${head}${quote(mask(t.user))}\n\n${asked ? `${asked}\n\n` : ""}**Claude**\n\n${reply}${cut}\n`;
}

// ---------- merge into memory.md ----------
const doc = fs.readFileSync(MEMORY, "utf8");
const s = doc.indexOf(START);
const e = doc.indexOf(END);
if (s < 0 || e < s) process.exit(0);
const before = doc.slice(0, s + START.length);
const after = doc.slice(e);
let log = doc.slice(s + START.length, e);

if (args.includes("--hide-last")) {
  const last = readTurns(transcript).at(-1);
  if (last) {
    const line = `${last.id}${args.includes("--message-only") ? " message-only" : ""}\n`;
    fs.mkdirSync(path.dirname(PRIVATE_LIST), { recursive: true });
    fs.appendFileSync(PRIVATE_LIST, line);
    console.log(`Hidden from the public log: ${line.trim()}`);
  }
  process.exit(0);
}

const blockRe = (id) => new RegExp(`<!-- turn:${id} -->[\\s\\S]*?(?=\\n<!-- turn:|\\n### Session |$)`);
const turns = readTurns(transcript);
const sid = sessionId || turns[0]?.session || "unknown";
turns.forEach((t, i) => {
  const block = render(t).trimEnd();
  const exists = log.includes(`<!-- turn:${t.id} -->`);
  if (!exists) {
    if (!log.includes(`<!-- session:${sid} -->`)) {
      log = `${log.trimEnd()}\n\n### Session ${when(t.at).split(",")[0]}\n<!-- session:${sid} -->\n`;
    }
    log = `${log.trimEnd()}\n\n${block}\n`;
  } else if (i >= turns.length - REWRITABLE || privateTurns.has(t.id)) {
    log = log.replace(blockRe(t.id), () => block);
  }
});

const next = `${before}${log.trimEnd()}\n\n${after}`;
if (next === doc) process.exit(0);
fs.writeFileSync(MEMORY, next);

// ---------- persist (feature branches only) ----------
if (!useGit) process.exit(0);
const git = (...a) => execFileSync("git", a, { cwd: ROOT, stdio: ["ignore", "pipe", "ignore"], timeout: 30000 }).toString().trim();
try {
  const branch = git("rev-parse", "--abbrev-ref", "HEAD");
  const gitDir = git("rev-parse", "--git-dir");
  const busy = ["MERGE_HEAD", "rebase-merge", "rebase-apply", "CHERRY_PICK_HEAD"].some((f) =>
    fs.existsSync(path.resolve(ROOT, gitDir, f)),
  );
  if (busy || ["main", "master", "HEAD"].includes(branch)) process.exit(0);
  git("add", "--", "memory.md");
  git("commit", "-m", "Update memory: conversation log", "--", "memory.md");
  git("push", "-u", "origin", branch);
} catch {
  /* offline or nothing to commit — the file is still updated locally */
}
