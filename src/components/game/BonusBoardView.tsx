import { useEffect, useRef, useState } from "react";
import { LADDERS, SNAKES, PRIZES, squarePos, hopSteps, finalPot } from "@/game/bonusBoard";
import { getSprite } from "@/game/assets";
import { publicUrl } from "@/game/publicUrl";
import { useGame } from "@/game/store";
import { formatLc } from "@/lib/utils";
import type { BoardEvent } from "@/game/types";

function woodNoise(x: number, y: number) {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

type BoardPop = {
  src: string;
  col: number;
  row: number;
  born: number;
  big: boolean;
  spin: number;
};

type Spark = {
  col: number;
  row: number;
  vx: number;
  vy: number;
  born: number;
  life: number;
  color: string;
  size: number;
};

const HOP_ART = [
  publicUrl("/sprites/pop-coin.png"),
  publicUrl("/sprites/pop-star.png"),
  publicUrl("/sprites/pop-banana.png"),
  publicUrl("/sprites/pop-crown.png"),
];
const SPARK_COLORS = ["#FFC14A", "#3DFFA6", "#FF5A8A", "#FFF6EC", "#2ECC71"];

export function BonusBoardView() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const board = useGame((s) => s.board);
  const bet = useGame((s) => s.boardBet);
  const started = useGame((s) => s.boardStarted);
  const skin = useGame((s) => s.skin);
  const lastEvents = useGame((s) => s.lastEvents);
  const reduced = useGame((s) => s.settings.reducedMotion);
  const dt = useGame((s) => s.dt);
  const startBoard = useGame((s) => s.startBoard);
  const playBoard = useGame((s) => s.playBoard);
  const spendDt = useGame((s) => s.spendDtOnBoard);
  const skip = useGame((s) => s.skipBoardAnim);
  const finishBoard = useGame((s) => s.finishBoard);

  const [displaySq, setDisplaySq] = useState(1);
  const [toast, setToast] = useState("");
  const [dice, setDice] = useState<[number, number] | null>(null);
  const animating = useRef(false);
  const skipRef = useRef(false);
  const hopRef = useRef({ col: 0, row: 9, squash: 1 });
  const popsRef = useRef<BoardPop[]>([]);
  const sparksRef = useRef<Spark[]>([]);
  const hopArt = useRef(0);

  function burst(square: number, src: string, _life = 980, big = false) {
    const p = squarePos(square);
    const now = performance.now();
    popsRef.current = popsRef.current.filter((pop) => !(pop.col === p.col && pop.row === p.row));
    popsRef.current.push({
      src,
      col: p.col,
      row: p.row,
      born: now,
      big,
      spin: (Math.random() - 0.5) * 0.4,
    });
    const n = big ? 22 : 10;
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2;
      const sp = (big ? 1.25 : 0.7) + Math.random() * 0.7;
      sparksRef.current.push({
        col: p.col + 0.5,
        row: p.row + 0.45,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp - 0.7,
        born: now,
        life: 780 + Math.random() * 500,
        color: SPARK_COLORS[i % SPARK_COLORS.length]!,
        size: (big ? 1.6 : 1) * (0.8 + Math.random() * 0.7),
      });
    }
    if (popsRef.current.length > 16) popsRef.current.splice(0, popsRef.current.length - 16);
    if (sparksRef.current.length > 100) sparksRef.current.splice(0, sparksRef.current.length - 100);
  }

  useEffect(() => {
    skipRef.current = !!board?.skipAnim;
  }, [board?.skipAnim]);

  useEffect(() => {
    if (board) {
      setDisplaySq(board.square);
      const pos = squarePos(board.square);
      if (!animating.current) hopRef.current = { ...pos, squash: 1 };
    }
  }, [board?.square]);

  useEffect(() => {
    if (!started || !lastEvents.length || !board) return;
    if (board.skipAnim || reduced || skipRef.current) {
      setDisplaySq(board.square);
      hopRef.current = { ...squarePos(board.square), squash: 1 };
      const t = window.setTimeout(() => {
        if (useGame.getState().board?.finished) finishBoard();
        else playBoard();
      }, board.finished ? 360 : 160);
      return () => window.clearTimeout(t);
    }
    void runEvents(lastEvents);
    return;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastEvents, started]);

  async function runEvents(events: BoardEvent[]) {
    if (animating.current) return;
    animating.current = true;
    for (const e of events) {
      if (skipRef.current) break;
      if (e.type === "roll") {
        setDice([e.dieA, e.dieB]);
        setToast(`${e.dieA} + ${e.dieB} = ${e.total}`);
        burst(useGame.getState().board?.square ?? 1, publicUrl("/sprites/pop-dice.png"), 780, false);
        await wait(skipRef.current ? 0 : 420);
      }
      if (e.type === "hop") await hopAlong(e.from, e.to);
      if (e.type === "climb") {
        setToast("Ladder!");
        burst(e.to, publicUrl("/sprites/pop-ladder.png"), 1280, true);
        burst(e.from, publicUrl("/sprites/pop-star.png"), 900, false);
        await animatePath(e.from, e.to, true);
      }
      if (e.type === "slide") {
        setToast("Whoops — a snake!");
        burst(e.from, publicUrl("/sprites/pop-cobra.png"), 1280, true);
        await animatePath(e.from, e.to, true);
      }
      if (e.type === "prize") {
        setToast(`+${formatLc(e.amount)}`);
        burst(
          e.square,
          e.amount >= bet * 8 ? publicUrl("/sprites/pop-chest.png") : publicUrl("/sprites/pop-coin.png"),
          1150,
          true,
        );
      }
      if (e.type === "mult") {
        setToast(`×${e.value} on the pot`);
        burst(useGame.getState().board?.square ?? 1, publicUrl("/sprites/pop-crown.png"), 1150, true);
      }
      if (e.type === "extra") {
        setToast("Extra roll!");
        burst(useGame.getState().board?.square ?? 1, publicUrl("/sprites/pop-dice.png"), 1050, true);
      }
      if (e.type === "finish") {
        setToast(`Finish bonus +${formatLc(e.bonus)}`);
        burst(100, publicUrl("/sprites/pop-chest.png"), 1500, true);
        burst(100, publicUrl("/sprites/pop-star.png"), 1500, true);
        burst(100, publicUrl("/sprites/pop-crown.png"), 1400, true);
      }
    }
    const s = useGame.getState();
    if (s.board) {
      setDisplaySq(s.board.square);
      hopRef.current = { ...squarePos(s.board.square), squash: 1 };
    }
    animating.current = false;
    const cur = useGame.getState();
    if (cur.board?.finished) finishBoard();
    else if (cur.boardStarted) playBoard();
  }

  function hopAlong(from: number, to: number) {
    const steps = hopSteps(from, to);
    return (async () => {
      let cur = from;
      let i = 0;
      for (const next of steps) {
        if (skipRef.current) {
          hopRef.current = { ...squarePos(to), squash: 1 };
          setDisplaySq(to);
          return;
        }
        await animatePath(cur, next, false);
        const last = i === steps.length - 1;
        if (!skipRef.current && (last || i % 2 === 0)) {
          burst(next, HOP_ART[hopArt.current++ % HOP_ART.length]!, last ? 920 : 640, last);
        }
        cur = next;
        i++;
      }
    })();
  }

  function animatePath(from: number, to: number, jump: boolean) {
    return new Promise<void>((resolve) => {
      if (skipRef.current) {
        const end = squarePos(to);
        hopRef.current = { col: end.col, row: end.row, squash: 1 };
        setDisplaySq(to);
        resolve();
        return;
      }
      const start = squarePos(from);
      const end = squarePos(to);
      const t0 = performance.now();
      const dur = jump ? 860 : 190;
      const step = (now: number) => {
        if (skipRef.current) {
          hopRef.current = { col: end.col, row: end.row, squash: 1 };
          setDisplaySq(to);
          resolve();
          return;
        }
        const t = Math.min(1, (now - t0) / dur);
        const e = 1 - Math.pow(1 - t, 3);
        const col = start.col + (end.col - start.col) * e;
        const row = start.row + (end.row - start.row) * e;
        const arc = jump ? Math.sin(t * Math.PI) * 1.05 : Math.sin(t * Math.PI) * 0.38;
        const squash = 1 + Math.sin(t * Math.PI) * 0.18 - Math.sin(t * Math.PI * 2) * 0.1;
        hopRef.current = { col, row: row - arc, squash };
        setDisplaySq(to);
        if (t < 1) requestAnimationFrame(step);
        else {
          hopRef.current = { col: end.col, row: end.row, squash: 1 };
          resolve();
        }
      };
      requestAnimationFrame(step);
    });
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    let raf = 0;
    const loop = () => {
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
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const now = performance.now();
        drawBoard(ctx, w, h, hopRef.current, skin, now, popsRef.current, sparksRef.current);
        sparksRef.current = sparksRef.current.filter((s) => now - s.born < s.life);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [skin, displaySq]);

  const pot = board ? finalPot(board, bet) : 0;

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col bg-navy">
      <header className="flex items-center justify-between gap-3 px-3 py-2">
        <div>
          <div className="font-display text-lg font-bold text-gold">Board Bonus</div>
          <div className="text-xs text-muted">
            Square {displaySq} · Rolls {board?.rollsLeft ?? 0} · Bet {formatLc(bet)}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {dice && (
            <div className="dice-burst flex gap-1" key={`${dice[0]}-${dice[1]}`} aria-hidden>
              <DieFace n={dice[0]} />
              <DieFace n={dice[1]} />
            </div>
          )}
          <div className="rounded-md bg-navy-2 px-3 py-2 text-right">
            <div className="text-[10px] uppercase tracking-wide text-muted">Pot</div>
            <div className="tabular font-display text-xl font-bold text-mint">{formatLc(pot)}</div>
          </div>
        </div>
      </header>

      <div ref={wrapRef} className="relative min-h-0 flex-1 px-2">
        <canvas ref={canvasRef} className="h-full w-full rounded-lg" />
      </div>

      <div className="flex items-center justify-between gap-2 px-3 py-3">
        <p key={toast} className="board-toast min-h-6 text-sm font-semibold text-cream">
          {toast}
        </p>
        {started && !board?.finished && (
          <button
            type="button"
            className="ghost-btn h-11 rounded-md px-3 text-sm"
            onClick={() => {
              skipRef.current = true;
              skip();
            }}
          >
            Skip animation
          </button>
        )}
      </div>

      {!started && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-navy/70 p-4">
          <div className="panel overlay-enter w-full max-w-md rounded-xl p-6">
            <h2 className="font-display text-2xl font-bold text-gold">Snakes & Ladders Board</h2>
            <p className="mt-2 text-sm text-muted">
              You have {board?.rollsAwarded ?? 0} dice rolls. Climb ladders, slide snakes (still collect the
              landing prize), and race toward square 100.
            </p>
            <p className="mt-3 text-sm text-cream">Multipliers apply to the final pot.</p>
            {dt > 0 && board && !board.spentDt && (
              <button
                type="button"
                className="ghost-btn mt-4 h-12 w-full rounded-md text-sm font-semibold"
                onClick={spendDt}
              >
                Spend 1 DT for +2 rolls
              </button>
            )}
            <button type="button" className="gold-btn mt-3 h-12 w-full rounded-md text-base" onClick={startBoard}>
              Roll the dice
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function wait(ms: number) {
  return new Promise<void>((r) => window.setTimeout(r, ms));
}

function DieFace({ n }: { n: number }) {
  const pips: [number, number][][] = [
    [],
    [[50, 50]],
    [
      [28, 28],
      [72, 72],
    ],
    [
      [28, 28],
      [50, 50],
      [72, 72],
    ],
    [
      [28, 28],
      [72, 28],
      [28, 72],
      [72, 72],
    ],
    [
      [28, 28],
      [72, 28],
      [50, 50],
      [28, 72],
      [72, 72],
    ],
    [
      [28, 28],
      [72, 28],
      [28, 50],
      [72, 50],
      [28, 72],
      [72, 72],
    ],
  ];
  return (
    <svg viewBox="0 0 100 100" className="size-8" aria-hidden>
      <rect x="4" y="4" width="92" height="92" rx="16" fill="#FF5A8A" />
      {pips[n]?.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="8" fill="#FFF6EC" />
      ))}
    </svg>
  );
}

function drawBoard(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  token: { col: number; row: number; squash: number },
  skin: string,
  now: number,
  pops: BoardPop[],
  sparks: Spark[],
) {
  const pad = Math.max(22, Math.min(w, h) * 0.055);
  const size = Math.min(w, h) - pad * 2;
  const ox = (w - size) / 2;
  const oy = (h - size) / 2;
  const cell = size / 10;

  ctx.fillStyle = "#0B1220";
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = "#6b4324";
  round(ctx, ox - 10, oy - 10, size + 20, size + 20, 16);
  ctx.fill();
  ctx.strokeStyle = "#d4a017";
  ctx.lineWidth = 3;
  ctx.stroke();

  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      const x = ox + c * cell;
      const y = oy + r * cell;
      const n = (9 - r) * 10 + ((9 - r) % 2 === 0 ? c : 9 - c) + 1;
      const alt = (c + r) % 2 === 0;
      ctx.fillStyle = alt ? "#FFF6EC" : "#f3d7b0";
      ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
      const grain = woodNoise(c, r) * 18;
      ctx.fillStyle = `rgba(92,58,30,${0.04 + grain * 0.004})`;
      ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);

      const prize = PRIZES[n];
      if (prize && prize.startsWith("bag")) ctx.fillStyle = "rgba(255,193,74,0.28)";
      else if (prize === "miniJP" || prize === "majorJP") ctx.fillStyle = "rgba(61,255,166,0.22)";
      else if (prize?.startsWith("x")) ctx.fillStyle = "rgba(255,90,138,0.18)";
      else if (prize === "extra") ctx.fillStyle = "rgba(46,204,113,0.2)";
      if (prize) ctx.fillRect(x + 2, y + 2, cell - 4, cell - 4);

      ctx.fillStyle = "#3A2040";
      ctx.font = `700 ${Math.max(9, cell * 0.22)}px Outfit, sans-serif`;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(String(n), x + 4, y + 4);

      if (prize) {
        ctx.font = `700 ${Math.max(10, cell * 0.26)}px Outfit, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#3A2040";
        const label =
          prize === "bagS"
            ? "$"
            : prize === "bagM"
              ? "$+"
              : prize === "bagL"
                ? "$++"
                : prize === "miniJP"
                  ? "Mini"
                  : prize === "majorJP"
                    ? "Major"
                    : prize === "extra"
                      ? "+1"
                      : prize === "x2"
                        ? "×2"
                        : prize === "x3"
                          ? "×3"
                          : prize === "x5"
                            ? "×5"
                            : "";
        ctx.fillText(label, x + cell / 2, y + cell * 0.62);
      }
    }
  }

  ctx.lineCap = "round";
  for (const L of LADDERS) {
    const a = squarePos(L.from);
    const b = squarePos(L.to);
    const x1 = ox + (a.col + 0.5) * cell;
    const y1 = oy + (a.row + 0.5) * cell;
    const x2 = ox + (b.col + 0.5) * cell;
    const y2 = oy + (b.row + 0.5) * cell;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const px = (-dy / len) * cell * 0.16;
    const py = (dx / len) * cell * 0.16;
    ctx.strokeStyle = "#d4a017";
    ctx.lineWidth = Math.max(4, cell * 0.08);
    ctx.beginPath();
    ctx.moveTo(x1 - px, y1 - py);
    ctx.lineTo(x2 - px, y2 - py);
    ctx.moveTo(x1 + px, y1 + py);
    ctx.lineTo(x2 + px, y2 + py);
    ctx.stroke();
    ctx.strokeStyle = "#FFC14A";
    ctx.lineWidth = Math.max(2.5, cell * 0.055);
    ctx.beginPath();
    ctx.moveTo(x1 - px, y1 - py);
    ctx.lineTo(x2 - px, y2 - py);
    ctx.moveTo(x1 + px, y1 + py);
    ctx.lineTo(x2 + px, y2 + py);
    ctx.stroke();
    ctx.strokeStyle = "#fff6ec";
    ctx.lineWidth = 2;
    const rungs = 6;
    for (let i = 1; i < rungs; i++) {
      const t = i / rungs;
      ctx.beginPath();
      ctx.moveTo(x1 - px + dx * t, y1 - py + dy * t);
      ctx.lineTo(x1 + px + dx * t, y1 + py + dy * t);
      ctx.stroke();
    }
  }

  for (const S of SNAKES) {
    drawSnake(ctx, S.from, S.to, ox, oy, cell, now);
  }

  const tx = ox + (token.col + 0.5) * cell;
  const bob = Math.sin(now / 210) * cell * 0.035;
  const ty = oy + (token.row + 0.5) * cell + bob;
  const img = getSprite(publicUrl(`/sprites/meeple-${skin}.png`));
  const tw = cell * 0.78;
  const th = cell * 0.9 * token.squash;
  ctx.save();
  ctx.fillStyle = "rgba(11,18,32,0.28)";
  ctx.beginPath();
  ctx.ellipse(tx, oy + (token.row + 0.82) * cell, tw * 0.32, cell * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (img) ctx.drawImage(img, tx - tw / 2, ty - th * 0.62, tw, th);
  else {
    ctx.fillStyle = "#FFC14A";
    ctx.beginPath();
    ctx.arc(tx, ty, cell * 0.28, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const pop of pops) {
    const age = now - pop.born;
    const intro = Math.min(1, age / 320);
    const ease = 1 - Math.pow(1 - intro, 3);
    const over = intro < 1 ? Math.sin(intro * Math.PI) * 0.28 : Math.sin(now / 280 + pop.col) * 0.04;
    const base = pop.big ? 2.15 : 1.45;
    const s = base * (0.2 + ease * 0.8 + over);
    const x = ox + (pop.col + 0.5) * cell;
    const y = oy + (pop.row + 0.42) * cell - (1 - ease) * cell * 0.85;
    const art = getSprite(pop.src);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(pop.spin * (1 - intro));
    ctx.scale(s, s);
    const d = cell * 1.05;
    if (art && art.complete && art.naturalWidth > 0) {
      ctx.drawImage(art, -d / 2, -d * 0.72, d, d);
    } else {
      ctx.fillStyle = pop.big ? "#FFC14A" : "#3DFFA6";
      ctx.beginPath();
      ctx.arc(0, 0, cell * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  for (const sp of sparks) {
    const age = (now - sp.born) / sp.life;
    if (age < 0 || age >= 1) continue;
    const x = ox + sp.col * cell + sp.vx * age * cell * 1.35;
    const y = oy + sp.row * cell + (sp.vy * age + age * age * 0.9) * cell;
    ctx.save();
    ctx.globalAlpha = 1 - age;
    ctx.fillStyle = sp.color;
    ctx.translate(x, y);
    ctx.rotate(age * 4);
    const s = cell * 0.08 * sp.size * (1 - age * 0.35);
    ctx.fillRect(-s, -s * 0.35, s * 2, s * 0.7);
    ctx.fillRect(-s * 0.35, -s, s * 0.7, s * 2);
    ctx.restore();
  }

  for (let i = 0; i < 10; i++) {
    const twinkle = 0.25 + 0.75 * Math.abs(Math.sin(now / 380 + i * 1.3));
    const sx = ox + ((i * 137) % 97) / 97 * size;
    const sy = oy + ((i * 89) % 97) / 97 * size;
    ctx.save();
    ctx.globalAlpha = twinkle * 0.45;
    ctx.fillStyle = i % 2 === 0 ? "#FFC14A" : "#FFF6EC";
    ctx.beginPath();
    ctx.arc(sx, sy, 1.4 + (i % 3) * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawSnake(
  ctx: CanvasRenderingContext2D,
  from: number,
  to: number,
  ox: number,
  oy: number,
  cell: number,
  now: number,
) {
  const a = squarePos(from);
  const b = squarePos(to);
  const x1 = ox + (a.col + 0.5) * cell;
  const y1 = oy + (a.row + 0.5) * cell;
  const x2 = ox + (b.col + 0.5) * cell;
  const y2 = oy + (b.row + 0.5) * cell;
  const sway = from % 2 === 0 ? 1 : -1;
  const mx = (x1 + x2) / 2 + sway * cell * 0.85;
  const my = (y1 + y2) / 2;
  const samples = 18;
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const wave = Math.sin(t * Math.PI * 3 + now / 260) * cell * 0.16 * sway;
    const x = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * (mx + wave) + t * t * x2;
    const y = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * my + t * t * y2;
    pts.push({ x, y });
  }
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#1e8f4a";
  ctx.lineWidth = Math.max(7, cell * 0.16);
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.stroke();
  ctx.strokeStyle = "#2ECC71";
  ctx.lineWidth = Math.max(5, cell * 0.11);
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.stroke();
  // stripes
  ctx.strokeStyle = "#196b38";
  ctx.lineWidth = Math.max(2, cell * 0.04);
  for (let i = 2; i < pts.length - 1; i += 3) {
    const p = pts[i]!;
    const q = pts[i + 1] ?? p;
    const dx = q.x - p.x;
    const dy = q.y - p.y;
    const len = Math.hypot(dx, dy) || 1;
    ctx.beginPath();
    ctx.moveTo(p.x - (dy / len) * cell * 0.08, p.y + (dx / len) * cell * 0.08);
    ctx.lineTo(p.x + (dy / len) * cell * 0.08, p.y - (dx / len) * cell * 0.08);
    ctx.stroke();
  }
  const hx = x1 + Math.sin(now / 180) * cell * 0.03;
  const hy = y1 + Math.cos(now / 220) * cell * 0.02;
  ctx.fillStyle = "#2ECC71";
  ctx.beginPath();
  ctx.arc(hx, hy, cell * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#FFF6EC";
  ctx.beginPath();
  ctx.arc(hx - cell * 0.06, hy - cell * 0.05, cell * 0.05, 0, Math.PI * 2);
  ctx.arc(hx + cell * 0.06, hy - cell * 0.05, cell * 0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#0B1220";
  ctx.beginPath();
  ctx.arc(hx - cell * 0.05, hy - cell * 0.045, cell * 0.024, 0, Math.PI * 2);
  ctx.arc(hx + cell * 0.07, hy - cell * 0.045, cell * 0.024, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#FF5A8A";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(hx, hy + cell * 0.16);
  ctx.lineTo(hx - cell * 0.07, hy + cell * 0.28);
  ctx.moveTo(hx, hy + cell * 0.16);
  ctx.lineTo(hx + cell * 0.07, hy + cell * 0.28);
  ctx.stroke();
}

function round(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
