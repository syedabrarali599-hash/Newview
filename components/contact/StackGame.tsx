"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import { revealHeading } from "@/lib/animations";
import styles from "./StackGame.module.css";

/**
 * "Pixel Stack" — a falling-blocks puzzle played on the contact page grid.
 * Blocks fall from the top; ← → move, ↑ rotates, ↓ drops faster, Space drops
 * instantly. Fill a row to clear it. On touch screens: tap to rotate, swipe
 * left/right to move, swipe down to drop.
 */

const CELL = 19; // matches the 19px grid in the design
const WELL_W = 10;
const INK = "#220d04";

type Shape = number[][];
type PieceDef = { shape: Shape; color: string };

const PIECES: PieceDef[] = [
  { shape: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], color: "#0b8a86" },
  { shape: [[1, 1], [1, 1]], color: "#ffd400" },
  { shape: [[0, 1, 0], [1, 1, 1], [0, 0, 0]], color: "#8b2cf5" },
  { shape: [[0, 1, 1], [1, 1, 0], [0, 0, 0]], color: "#f096aa" },
  { shape: [[1, 1, 0], [0, 1, 1], [0, 0, 0]], color: INK },
  { shape: [[1, 0, 0], [1, 1, 1], [0, 0, 0]], color: "#3b82f6" },
  { shape: [[0, 0, 1], [1, 1, 1], [0, 0, 0]], color: "#e85313" },
];

const rotateCW = (m: Shape): Shape => m[0].map((_, i) => m.map((r) => r[i]).reverse());
const rotateCCW = (m: Shape): Shape => rotateCW(rotateCW(rotateCW(m)));

type Piece = { shape: Shape; color: string; x: number; y: number };
type Spark = { x: number; y: number; vx: number; vy: number; life: number; color: string };
type Phase = "intro" | "playing" | "paused" | "over";

const BEST_KEY = "newview-pixel-stack-best";
const readBest = () => {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
};
const writeBest = (v: number) => {
  try {
    localStorage.setItem(BEST_KEY, String(v));
  } catch {
    /* ignore */
  }
};

export default function StackGame() {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("intro");
  const [hud, setHud] = useState({ score: 0, lines: 0, level: 1, best: 0 });
  const [layout, setLayout] = useState({ wellX: 0, cols: 0, rows: 0 });
  const phaseRef = useRef<Phase>("intro");
  const api = useRef<{ start: () => void; resume: () => void; pause: () => void } | null>(null);

  const setPhaseBoth = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  useEffect(() => setHud((h) => ({ ...h, best: readBest() })), []);

  // ---------- Engine ----------
  useEffect(() => {
    const el = wrap.current!;
    const cv = canvas.current!;
    const ctx = cv.getContext("2d")!;

    let cols = 0;
    let rows = 0;
    let wellX = 0;
    let board: (string | null)[][] = [];
    let piece: Piece | null = null;
    let next: PieceDef = PIECES[0];
    let bag: number[] = [];
    let score = 0;
    let lines = 0;
    let level = 1;
    let dropTimer = 0;
    let lockTimer = 0;
    let lockMoves = 0;
    let softDrop = false;
    let clearing: { rows: number[]; t: number } | null = null;
    let sparks: Spark[] = [];
    let raf = 0;
    let last = 0;

    const nextFromBag = () => {
      if (!bag.length) bag = [0, 1, 2, 3, 4, 5, 6].sort(() => Math.random() - 0.5);
      return PIECES[bag.pop()!];
    };

    const resize = () => {
      const r = el.getBoundingClientRect();
      cols = Math.floor(r.width / CELL);
      rows = Math.floor(r.height / CELL);
      wellX = Math.max(0, Math.floor((cols - WELL_W) / 2));
      cv.width = Math.round(r.width);
      cv.height = Math.round(r.height);
      // Keep the board if the size didn't change rows (e.g. scrollbar shifts).
      if (board.length !== rows) board = Array.from({ length: rows }, () => Array(WELL_W).fill(null));
      setLayout({ wellX, cols, rows });
      draw();
    };

    const collides = (shape: Shape, x: number, y: number) => {
      for (let j = 0; j < shape.length; j++)
        for (let i = 0; i < shape[j].length; i++) {
          if (!shape[j][i]) continue;
          const bx = x + i;
          const by = y + j;
          if (bx < 0 || bx >= WELL_W || by >= rows) return true;
          if (by >= 0 && board[by][bx]) return true;
        }
      return false;
    };

    const spawn = () => {
      const def = next;
      next = nextFromBag();
      const size = def.shape.length;
      piece = { shape: def.shape, color: def.color, x: Math.floor((WELL_W - size) / 2), y: def.shape[0].every((v) => !v) ? -1 : 0 };
      lockTimer = 0;
      lockMoves = 0;
      if (collides(piece.shape, piece.x, piece.y)) gameOver();
    };

    const syncHud = () => setHud((h) => ({ ...h, score, lines, level }));

    const lock = () => {
      if (!piece) return;
      const p = piece;
      p.shape.forEach((row, j) =>
        row.forEach((v, i) => {
          if (v && p.y + j >= 0) board[p.y + j][p.x + i] = p.color;
        }),
      );
      if (p.shape.some((row, j) => row.some((v) => v && p.y + j < 0))) return gameOver();
      piece = null;
      const full = board.map((r, j) => (r.every(Boolean) ? j : -1)).filter((j) => j >= 0);
      if (full.length) {
        clearing = { rows: full, t: 0 };
        // Cleared blocks burst into little pixels.
        full.forEach((j) =>
          board[j].forEach((c, i) => {
            for (let k = 0; k < 3; k++)
              sparks.push({
                x: (wellX + i + 0.5) * CELL,
                y: (j + 0.5) * CELL,
                vx: (Math.random() - 0.5) * 260,
                vy: -Math.random() * 260 - 60,
                life: 1,
                color: c ?? "#e85313",
              });
          }),
        );
        score += [0, 100, 300, 500, 800][full.length] * level;
        lines += full.length;
        level = 1 + Math.floor(lines / 10);
      } else spawn();
      syncHud();
    };

    const finishClear = () => {
      if (!clearing) return;
      const keep = board.filter((_, j) => !clearing!.rows.includes(j));
      board = [...Array.from({ length: clearing.rows.length }, () => Array(WELL_W).fill(null)), ...keep];
      clearing = null;
      spawn();
    };

    const move = (dx: number) => {
      if (!piece || clearing) return;
      if (!collides(piece.shape, piece.x + dx, piece.y)) {
        piece.x += dx;
        if (lockTimer > 0 && lockMoves++ < 15) lockTimer = 0;
      }
    };

    const rotate = (dir: 1 | -1) => {
      if (!piece || clearing) return;
      const shape = dir === 1 ? rotateCW(piece.shape) : rotateCCW(piece.shape);
      for (const [kx, ky] of [[0, 0], [-1, 0], [1, 0], [-2, 0], [2, 0], [0, -1]]) {
        if (!collides(shape, piece.x + kx, piece.y + ky)) {
          piece.shape = shape;
          piece.x += kx;
          piece.y += ky;
          if (lockTimer > 0 && lockMoves++ < 15) lockTimer = 0;
          return;
        }
      }
    };

    const ghostY = () => {
      if (!piece) return 0;
      let y = piece.y;
      while (!collides(piece.shape, piece.x, y + 1)) y++;
      return y;
    };

    const hardDrop = () => {
      if (!piece || clearing) return;
      const y = ghostY();
      score += (y - piece.y) * 2;
      piece.y = y;
      lock();
    };

    const gameOver = () => {
      piece = null;
      setPhaseBoth("over");
      if (score > readBest()) writeBest(score);
      setHud({ score, lines, level, best: Math.max(score, readBest()) });
      draw();
    };

    // ---------- Drawing ----------
    const block = (x: number, y: number, color: string, alpha = 1) => {
      const px = x * CELL;
      const py = y * CELL;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.fillRect(px + 1, py + 1, CELL - 1, CELL - 1);
      ctx.fillStyle = "rgba(255,255,255,0.32)";
      ctx.fillRect(px + 1, py + 1, CELL - 1, 3);
      ctx.fillRect(px + 1, py + 4, 3, CELL - 4);
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.fillRect(px + 1, py + CELL - 3, CELL - 1, 3);
      ctx.fillRect(px + CELL - 3, py + 1, 3, CELL - 4);
      ctx.globalAlpha = 1;
    };

    const draw = () => {
      ctx.clearRect(0, 0, cv.width, cv.height);
      // Before the first game the grid stays plain, as in the design.
      if (!rows || phaseRef.current === "intro") return;
      // The well
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.fillRect(wellX * CELL, 0, WELL_W * CELL + 1, rows * CELL + 1);
      ctx.fillStyle = "rgba(34,13,4,0.35)";
      ctx.fillRect(wellX * CELL - 1, 0, 2, rows * CELL + 1);
      ctx.fillRect((wellX + WELL_W) * CELL, 0, 2, rows * CELL + 1);

      board.forEach((row, j) =>
        row.forEach((c, i) => {
          if (!c) return;
          const flashing = clearing?.rows.includes(j);
          if (flashing) {
            const on = Math.floor(clearing!.t * 14) % 2 === 0;
            block(wellX + i, j, on ? "#ffffff" : c);
          } else block(wellX + i, j, c);
        }),
      );

      if (piece) {
        const gy = ghostY();
        const p = piece;
        p.shape.forEach((row, j) =>
          row.forEach((v, i) => {
            if (!v || gy + j < 0) return;
            ctx.strokeStyle = p.color;
            ctx.globalAlpha = 0.45;
            ctx.lineWidth = 2;
            ctx.strokeRect((wellX + p.x + i) * CELL + 2, (gy + j) * CELL + 2, CELL - 3, CELL - 3);
            ctx.globalAlpha = 1;
          }),
        );
        p.shape.forEach((row, j) =>
          row.forEach((v, i) => {
            if (v && p.y + j >= 0) block(wellX + p.x + i, p.y + j, p.color);
          }),
        );
      }

      // Next piece, to the right of the well
      if (cols >= wellX + WELL_W + 6) {
        const nx = wellX + WELL_W + 2;
        next.shape.forEach((row, j) =>
          row.forEach((v, i) => {
            if (v) block(nx + i, 3 + j, next.color);
          }),
        );
      }

      for (const s of sparks) {
        ctx.globalAlpha = Math.max(0, s.life);
        ctx.fillStyle = s.color;
        ctx.fillRect(Math.round(s.x), Math.round(s.y), 5, 5);
      }
      ctx.globalAlpha = 1;
    };

    // ---------- Loop ----------
    const interval = () => (softDrop ? 40 : Math.max(70, 800 - (level - 1) * 75));

    const tick = (now: number) => {
      const dt = Math.min(50, now - (last || now));
      last = now;
      if (phaseRef.current === "playing") {
        if (clearing) {
          clearing.t += dt / 1000;
          if (clearing.t > 0.28) finishClear();
        } else if (piece) {
          const grounded = collides(piece.shape, piece.x, piece.y + 1);
          if (grounded) {
            lockTimer += dt;
            if (lockTimer > 420) lock();
          } else {
            dropTimer += dt;
            if (dropTimer >= interval()) {
              dropTimer = 0;
              piece.y++;
              if (softDrop) {
                score += 1;
                syncHud();
              }
            }
          }
        }
      }
      sparks = sparks.filter((s) => {
        s.life -= dt / 700;
        s.vy += 900 * (dt / 1000);
        s.x += s.vx * (dt / 1000);
        s.y += s.vy * (dt / 1000);
        return s.life > 0;
      });
      draw();
      if (phaseRef.current === "playing" || sparks.length) raf = requestAnimationFrame(tick);
      else raf = 0;
    };
    const loop = () => {
      if (!raf) {
        last = 0;
        raf = requestAnimationFrame(tick);
      }
    };

    // ---------- Controls ----------
    const onKey = (e: KeyboardEvent) => {
      if (phaseRef.current !== "playing") return;
      const keys = ["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", " ", "Spacebar"];
      if (keys.includes(e.key)) e.preventDefault();
      if (e.key === "ArrowLeft") move(-1);
      else if (e.key === "ArrowRight") move(1);
      else if (e.key === "ArrowUp" || e.key === "x" || e.key === "X") rotate(1);
      else if (e.key === "z" || e.key === "Z") rotate(-1);
      else if (e.key === "ArrowDown") softDrop = true;
      else if (e.key === " " || e.key === "Spacebar") {
        if (!e.repeat) hardDrop();
      } else if (e.key === "p" || e.key === "P" || e.key === "Escape") pause();
      draw();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") softDrop = false;
    };

    // Touch: tap rotates, swipe moves, swipe down drops.
    let touchStart: { x: number; y: number; t: number } | null = null;
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== "touch" || phaseRef.current !== "playing") return;
      touchStart = { x: e.clientX, y: e.clientY, t: performance.now() };
    };
    const onPointerUp = (e: PointerEvent) => {
      if (!touchStart || e.pointerType !== "touch") return;
      const dx = e.clientX - touchStart.x;
      const dy = e.clientY - touchStart.y;
      touchStart = null;
      if (Math.abs(dx) < 14 && Math.abs(dy) < 14) rotate(1);
      else if (Math.abs(dx) > Math.abs(dy)) {
        const steps = Math.max(1, Math.round(Math.abs(dx) / CELL));
        for (let s = 0; s < steps; s++) move(Math.sign(dx));
      } else if (dy > 30) hardDrop();
      draw();
    };

    const start = () => {
      board = Array.from({ length: rows }, () => Array(WELL_W).fill(null));
      bag = [];
      next = nextFromBag();
      score = 0;
      lines = 0;
      level = 1;
      dropTimer = 0;
      clearing = null;
      sparks = [];
      syncHud();
      setPhaseBoth("playing");
      spawn();
      el.focus({ preventScroll: true });
      loop();
    };
    const resume = () => {
      setPhaseBoth("playing");
      el.focus({ preventScroll: true });
      loop();
    };
    const pause = () => {
      if (phaseRef.current !== "playing") return;
      softDrop = false;
      setPhaseBoth("paused");
    };
    api.current = { start, resume, pause };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    // Pause when scrolled out of view or the tab is hidden.
    const io = new IntersectionObserver(([en]) => !en.isIntersecting && pause(), { threshold: 0.35 });
    io.observe(el);
    const onVis = () => document.hidden && pause();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointerup", onPointerUp);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointerup", onPointerUp);
    };
  }, [setPhaseBoth]);

  // Click anywhere on the grid to start, resume or play again.
  const onClick = () => {
    const p = phaseRef.current;
    if (p === "intro" || p === "over") api.current?.start();
    else if (p === "paused") api.current?.resume();
  };
  const onKeyStart = (e: React.KeyboardEvent) => {
    if ((e.key === "Enter" || e.key === " ") && phaseRef.current !== "playing") {
      e.preventDefault();
      onClick();
    }
  };

  // Card in/out
  useEffect(() => {
    if (!card.current) return;
    if (phase === "playing") gsap.to(card.current, { autoAlpha: 0, y: -16, duration: 0.35, ease: "power2.in" });
    else gsap.fromTo(card.current, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: "power3.out" });
  }, [phase]);

  // Section reveal on scroll
  useGSAP(
    () => {
      const q = gsap.utils.selector(wrap);
      if (prefersReducedMotion()) {
        gsap.set(q(".js-reveal"), { autoAlpha: 1 });
        return;
      }
      gsap.fromTo(
        wrap.current,
        { clipPath: "inset(0 0 100% 0)" },
        {
          clipPath: "inset(0 0 0% 0)",
          duration: 1.2,
          ease: "expo.inOut",
          scrollTrigger: { trigger: wrap.current, start: "top 85%", once: true },
        },
      );
      revealHeading(q(`.${styles.title}`)[0] as HTMLElement, { trigger: wrap.current!, start: "top 70%" });
      gsap.fromTo(
        q(`.${styles.hint}`),
        { autoAlpha: 0, y: 12 },
        { autoAlpha: 1, y: 0, duration: 0.8, delay: 0.5, scrollTrigger: { trigger: wrap.current, start: "top 70%", once: true } },
      );
    },
    { scope: wrap },
  );

  const playing = phase === "playing";
  const hudLeft = Math.max(0, (layout.wellX - 7) * CELL);

  return (
    <div
      ref={wrap}
      className={styles.game}
      data-playing={playing}
      onClick={onClick}
      onKeyDown={onKeyStart}
      tabIndex={0}
      role="application"
      aria-label="Pixel Stack: a falling-blocks game. Press Enter to start. Arrow keys move and rotate, Space drops."
    >
      <canvas ref={canvas} className={styles.canvas} aria-hidden="true" />

      {phase !== "intro" && (
        <div className={styles.hud} style={{ left: hudLeft, top: 2 * CELL }} aria-live="polite">
          <p>
            <span>Score</span>
            <strong>{hud.score.toLocaleString()}</strong>
          </p>
          <p>
            <span>Lines</span>
            <strong>{hud.lines}</strong>
          </p>
          <p>
            <span>Level</span>
            <strong>{hud.level}</strong>
          </p>
          {hud.best > 0 && (
            <p>
              <span>Best</span>
              <strong>{hud.best.toLocaleString()}</strong>
            </p>
          )}
          <ul className={styles.controls} aria-label="Controls">
            <li>← → Move</li>
            <li>↑ Rotate</li>
            <li>↓ Faster</li>
            <li>Space Drop</li>
            <li>P Pause</li>
          </ul>
        </div>
      )}
      {phase !== "intro" && layout.cols >= layout.wellX + WELL_W + 6 && (
        <p className={styles.nextLabel} style={{ left: (layout.wellX + WELL_W + 2) * CELL, top: CELL }}>
          Next
        </p>
      )}

      <div ref={card} className={styles.card}>
        {phase === "intro" && (
          <>
            <h2 className={`${styles.title} js-reveal`}>Want to have fun?</h2>
            <p className={`${styles.hint} js-reveal`}>Click anywhere to start the game</p>
          </>
        )}
        {phase === "paused" && (
          <>
            <h2 className={styles.title}>Paused</h2>
            <p className={styles.hint}>Click anywhere to keep playing</p>
          </>
        )}
        {phase === "over" && (
          <>
            <h2 className={styles.title}>Game over</h2>
            <p className={styles.hint}>
              You scored {hud.score.toLocaleString()} · Click anywhere to play again
            </p>
          </>
        )}
      </div>
    </div>
  );
}
