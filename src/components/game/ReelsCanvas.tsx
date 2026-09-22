import { useEffect, useRef } from "react";
import { BET_STEPS, SYMBOL_SPRITE, TILE_LETTER } from "@/game/constants";
import { getSprite } from "@/game/assets";
import { publicUrl } from "@/game/publicUrl";
import { makeRng } from "@/game/rng";
import { useGame } from "@/game/store";
import type { Grid, LineWin, SymbolId } from "@/game/types";
import { sfxRiser, sfxStop } from "@/game/audio";
import { PAYLINES } from "@/game/paytable";

const COLS = 5;
const VIS = 3;
const STRIP_PAD = 22;

type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; s: number; a: number };

type Reel = {
  strip: SymbolId[];
  offset: number;
  speed: number;
  phase: "idle" | "spin" | "stop";
  target: number;
  delay: number;
  bounce: number;
  squash: number;
};

function idleGrid(): Grid {
  return [
    ["ace", "wild", "ten"],
    ["ladder", "cobra", "king"],
    ["dice", "banana", "queen"],
    ["miniLadder", "basket", "jack"],
    ["cobra", "ladder", "ace"],
  ];
}

function buildStrip(resultCol: SymbolId[], rng: ReturnType<typeof makeRng>, free: boolean): SymbolId[] {
  const pool: SymbolId[] = [
    "ten",
    "jack",
    "queen",
    "king",
    "ace",
    "basket",
    "banana",
    "cobra",
    "ladder",
    "wild",
    "dice",
    "miniLadder",
  ];
  const head = Array.from({ length: STRIP_PAD }, () => rng.pick(free ? pool.filter((s) => s !== "dice") : pool));
  return [...head, ...resultCol];
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

const TILE = { top: "#fff6ec", bot: "#e4c98a", ink: "#3A2040" };

function drawSymbol(ctx: CanvasRenderingContext2D, id: SymbolId, x: number, y: number, w: number, h: number, squash: number) {
  ctx.save();
  const cx = x + w / 2;
  const cy = y + h / 2;
  const uniform = 0.94 + squash * 0.06;
  ctx.translate(cx, cy);
  ctx.scale(uniform, uniform);
  ctx.translate(-cx, -cy);

  const pad = Math.min(w, h) * 0.045;
  const tx = x + pad;
  const ty = y + pad;
  const tw = w - pad * 2;
  const th = h - pad * 2;
  roundRect(ctx, tx, ty, tw, th, Math.min(14, tw * 0.12));
  const g = ctx.createLinearGradient(tx, ty, tx, ty + th);
  g.addColorStop(0, TILE.top);
  g.addColorStop(1, TILE.bot);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = "rgba(58,32,64,0.28)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const letter = TILE_LETTER[id];
  if (letter) {
    ctx.fillStyle = TILE.ink;
    ctx.font = `800 ${Math.floor(Math.min(tw, th) * 0.62)}px Fraunces, Georgia, serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(letter, cx, cy + 1);
  } else {
    const src = SYMBOL_SPRITE[id];
    const img = getSprite(src);
    if (img && img.complete && img.naturalWidth > 0) {
      const box = Math.min(tw, th) * 0.9;
      const scale = box / Math.max(img.naturalWidth, img.naturalHeight);
      const dw = img.naturalWidth * scale;
      const dh = img.naturalHeight * scale;
      ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
    }
  }
  ctx.restore();
}

export function ReelsCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const spinning = useGame((s) => s.spinning);
  const spinNonce = useGame((s) => s.spinNonce);
  const pending = useGame((s) => s.pendingResult);
  const last = useGame((s) => s.lastResult);
  const betIndex = useGame((s) => s.betIndex);
  const turbo = useGame((s) => s.turbo || s.holdingTurbo || s.settings.reducedMotion);
  const reduced = useGame((s) => s.settings.reducedMotion);
  const hold = useGame((s) => s.hold);
  const free = useGame((s) => s.free);
  const onLanded = useGame((s) => s.onReelsLanded);
  const spin = useGame((s) => s.spin);
  const setHoldingTurbo = useGame((s) => s.setHoldingTurbo);

  const reels = useRef<Reel[]>([]);
  const gridRef = useRef<Grid>(idleGrid());
  const parts = useRef<Particle[]>([]);
  const landOnce = useRef(false);
  const winT = useRef(0);
  const snakeT = useRef(0);
  const shake = useRef(0);

  useEffect(() => {
    if (reels.current.length === 0) {
      const g = gridRef.current;
      reels.current = g.map((col) => ({
        strip: col,
        offset: 0,
        speed: 0,
        phase: "idle",
        target: 0,
        delay: 0,
        bounce: 0,
        squash: 1,
      }));
    }
  }, []);

  useEffect(() => {
    if (!spinning || !pending) return;
    const rng = makeRng();
    const dur = turbo ? 0.35 : 1.05;
    landOnce.current = false;
    snakeT.current = pending.snakePeek ? 1.4 : 0;
    pending.grid.forEach((col, i) => {
      const strip = buildStrip(col, rng, !!free);
      reels.current[i] = {
        strip,
        offset: 0,
        speed: turbo ? 52 : 28,
        phase: "spin",
        target: STRIP_PAD,
        delay: turbo ? i * 0.03 : i * 0.08,
        bounce: 0,
        squash: 1,
      };
    });
    if (!turbo && !reduced) {
      window.setTimeout(() => sfxRiser(), Math.max(0, dur * 1000 - 420));
    }
    gridRef.current = pending.grid;
  }, [spinNonce, spinning, pending, turbo, reduced, free]);

  useEffect(() => {
    const canvas = ref.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    let raf = 0;
    let lastT = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - lastT) / 1000);
      lastT = now;
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const gap = Math.max(4, w * 0.012);
      const cellW = (w - gap * (COLS + 1)) / COLS;
      const cellH = (h - gap * (VIS + 1)) / VIS;

      // update reels
      let allIdle = true;
      reels.current.forEach((r) => {
        if (r.delay > 0) {
          r.delay -= dt;
          allIdle = false;
          return;
        }
        if (r.phase === "spin") {
          allIdle = false;
          r.offset += r.speed * dt;
          const dist = r.target - r.offset;
          if (dist < 6) r.speed = Math.max(8, r.speed * (1 - 2.4 * dt));
          if (r.offset >= r.target - 0.08) {
            r.phase = "stop";
            r.offset = r.target;
            r.bounce = reduced ? 0 : 0.14;
            r.squash = 0.86;
            sfxStop();
          }
        } else if (r.phase === "stop") {
          allIdle = false;
          r.bounce *= Math.exp(-16 * dt);
          r.squash += (1 - r.squash) * (1 - Math.exp(-18 * dt));
          if (r.bounce < 0.002 && Math.abs(r.squash - 1) < 0.01) {
            r.phase = "idle";
            r.bounce = 0;
            r.squash = 1;
          }
        }
      });

      if (spinning && allIdle && reels.current.length && !landOnce.current) {
        landOnce.current = true;
        const pay = pending?.totalPay ?? 0;
        const bet = BET_STEPS[betIndex] ?? 100;
        if (pay > 0) shake.current = Math.min(1, pay / (bet * 80) + 0.18);
        if (pending?.fiveKind || (pending && pending.totalPay > 0 && pending.lineWins.some((w) => w.count >= 4))) {
          burst(w / 2, h / 2, 42);
        } else if (pay > 0) {
          burst(w / 2, h / 2, 16);
        }
        onLanded();
      }

      winT.current += dt;
      if (snakeT.current > 0) snakeT.current -= dt;
      shake.current = Math.max(0, shake.current - dt * 2.2);

      const sx = reduced ? 0 : (Math.random() - 0.5) * 10 * shake.current * shake.current;
      const sy = reduced ? 0 : (Math.random() - 0.5) * 8 * shake.current * shake.current;

      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ctx.translate(sx, sy);

      // felt
      ctx.fillStyle = "#173226";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "rgba(61,255,166,0.05)";
      ctx.beginPath();
      ctx.ellipse(w / 2, h / 2, w * 0.42, h * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();

      const wins: LineWin[] = !spinning && last ? last.lineWins : [];
      const winCells = new Set<string>();
      wins.forEach((ln) => ln.cells.forEach((c) => winCells.add(`${c.reel}:${c.row}`)));

      reels.current.forEach((r, i) => {
        const x = gap + i * (cellW + gap);
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, gap, cellW, h - gap * 2);
        ctx.clip();

        const locked = hold && hold.reel === i;
        for (let k = -1; k < VIS + 2; k++) {
          const idx = Math.floor(r.offset) + k;
          if (idx < 0 || idx >= r.strip.length) continue;
          const id = r.strip[idx]!;
          const y =
            gap +
            (k - (r.offset % 1)) * cellH +
            (r.phase === "stop" ? Math.sin(winT.current * 20) * r.bounce * 10 : 0);
          const row = idx - Math.floor(r.target);
          const key = `${i}:${row}`;
          if (winCells.has(key) && !spinning) {
            ctx.save();
            ctx.globalAlpha = 0.35 + Math.sin(winT.current * 6) * 0.15;
            ctx.fillStyle = "#FFC14A";
            roundRect(ctx, x + 2, y + 2, cellW - 4, cellH - 4, 12);
            ctx.fill();
            ctx.restore();
          }
          drawSymbol(ctx, id, x, y, cellW, cellH, r.squash);
        }
        ctx.restore();

        // column frame
        ctx.strokeStyle = locked ? "#3DFFA6" : "rgba(212,160,23,0.45)";
        ctx.lineWidth = locked ? 3 : 1.5;
        roundRect(ctx, x, gap, cellW, h - gap * 2, 8);
        ctx.stroke();
      });

      // win lines
      if (wins.length && !spinning) {
        const which = Math.floor(winT.current * 1.3) % Math.max(1, wins.length);
        const ln = wins[which]!;
        const rows = PAYLINES[ln.line] ?? ln.cells.map((c) => c.row);
        ctx.strokeStyle = "#FFC14A";
        ctx.lineWidth = 4;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        rows.forEach((row, reel) => {
          const x = gap + reel * (cellW + gap) + cellW / 2;
          const y = gap + row * cellH + cellH / 2;
          if (reel === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
        ctx.globalAlpha = 1;
        const lastCell = rows.length - 1;
        const ex = gap + lastCell * (cellW + gap) + cellW - 16;
        const ey = gap + (rows[lastCell] ?? 1) * cellH + 16;
        ctx.strokeStyle = "#3DFFA6";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(ex - 6, ey);
        ctx.lineTo(ex - 1, ey + 6);
        ctx.lineTo(ex + 8, ey - 6);
        ctx.stroke();
      }

      // particles
      const next: Particle[] = [];
      for (const p of parts.current) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 820 * dt;
        p.life -= dt;
        if (p.life > 0) {
          ctx.globalAlpha = Math.max(0, p.life / p.max);
          ctx.fillStyle = "#FFC14A";
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
          next.push(p);
        }
      }
      parts.current = next;

      // snake peek
      if (snakeT.current > 0) {
        const img = getSprite(publicUrl("/sprites/snake-peek.png"));
        const t = 1 - snakeT.current / 1.4;
        const x = -200 + t * (w + 400);
        const y = 8 + Math.sin(t * 8) * 6;
        if (img) ctx.drawImage(img, x, y, 220, 96);
      }

      ctx.restore();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [spinning, pending, last, hold, onLanded, reduced, betIndex]);

  function burst(x: number, y: number, n: number) {
    for (let i = 0; i < n; i++) {
      parts.current.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 420,
        vy: -220 - Math.random() * 280,
        life: 0.7 + Math.random() * 0.5,
        max: 1.2,
        s: 3 + Math.random() * 4,
        a: 1,
      });
    }
  }

  return (
    <div
      ref={wrapRef}
      className="relative h-full w-full touch-none overflow-hidden rounded-[14px]"
      onPointerDown={() => {
        setHoldingTurbo(true);
        if (!spinning) spin();
      }}
      onPointerUp={() => setHoldingTurbo(false)}
      onPointerLeave={() => setHoldingTurbo(false)}
      onPointerCancel={() => setHoldingTurbo(false)}
    >
      <canvas ref={ref} className="block h-full w-full" />
    </div>
  );
}
