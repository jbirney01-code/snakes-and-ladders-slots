import { BASE_WEIGHTS, FREE_WEIGHTS, HIGH_SYMBOLS, REELS, ROWS } from "./constants";
import { boardRollsFromScatters, countAnywhere, evaluateLines, freeSpinsFromScatters } from "./paytable";
import { makeRng, type Rng } from "./rng";
import type { FeatureKind, Grid, SpinMode, SpinResult, SymbolId } from "./types";

function cloneWeights(src: Record<SymbolId, number>): Record<SymbolId, number> {
  return { ...src };
}

function fillGrid(rng: Rng, weights: Record<SymbolId, number>): Grid {
  const grid: Grid = [];
  for (let r = 0; r < REELS; r++) {
    const col: SymbolId[] = [];
    for (let y = 0; y < ROWS; y++) col.push(rng.weighted(weights));
    grid.push(col);
  }
  return grid;
}

function applyExpandingLadders(grid: Grid): { grid: Grid; expands: number } {
  let expands = 0;
  const next: Grid = grid.map((col) => col.slice());
  for (let r = 0; r < REELS; r++) {
    if (next[r]!.some((s) => s === "ladder" || s === "wild")) {
      // Crown Ladder expands the reel during free spins.
      if (next[r]!.some((s) => s === "ladder")) {
        next[r] = ["ladder", "ladder", "ladder"];
        expands += 1;
      }
    }
  }
  return { grid: next, expands };
}

function nearMissDice(grid: Grid): { reel: number; row: number } | null {
  const dice = countAnywhere(grid, "dice");
  if (dice !== 2) return null;
  // Nudge a high-row adjacent cell conceptually: pick a non-dice cell on a reel without dice.
  for (let r = REELS - 1; r >= 0; r--) {
    if (grid[r]!.includes("dice")) continue;
    return { reel: r, row: 1 };
  }
  return null;
}

function forceSmallWin(rng: Rng, bet: number): Grid {
  const low: SymbolId[] = ["ten", "jack", "queen", "king", "ace"];
  const s = rng.pick(low);
  const grid = fillGrid(rng, BASE_WEIGHTS);
  const row = rng.int(0, 2);
  for (let r = 0; r < 3; r++) grid[r]![row] = r === 0 && rng.chance(0.25) ? "wild" : s;
  void bet;
  return grid;
}

export type SpinOpts = {
  bet: number;
  mode: SpinMode;
  spinIndex: number; // lifetime spins (for early luck)
  drySpins: number;
  fsMultiplier?: number;
  holdReel?: number | null;
  holdSymbol?: SymbolId | null;
  force?: { feature?: FeatureKind; grid?: Grid };
  rng?: Rng;
};

export function spinOnce(opts: SpinOpts): SpinResult & { expands: number } {
  const rng = opts.rng ?? makeRng();
  const early = opts.spinIndex < 30;
  const weights = cloneWeights(opts.mode === "free" ? FREE_WEIGHTS : BASE_WEIGHTS);

  if (early && opts.mode === "base") {
    weights.dice *= 1.75;
    weights.miniLadder *= 1.65;
    weights.wild *= 1.3;
    weights.ladder *= 1.2;
  }

  let grid: Grid;
  if (opts.force?.grid) {
    grid = opts.force.grid.map((c) => c.slice());
  } else if (opts.force?.feature === "board") {
    grid = fillGrid(rng, weights);
    const spots = [0, 1, 2, 3, 4];
    for (let i = 0; i < 3; i++) {
      const reel = spots[i] ?? i;
      grid[reel]![rng.int(0, 2)] = "dice";
    }
  } else if (opts.force?.feature === "freeSpins") {
    grid = fillGrid(rng, weights);
    for (let i = 0; i < 3; i++) grid[i]![rng.int(0, 2)] = "miniLadder";
  } else {
    grid = fillGrid(rng, weights);
    if (opts.mode === "base" && opts.drySpins >= 7 && early) {
      grid = forceSmallWin(rng, opts.bet);
    }
  }

  if (opts.mode === "hold" && opts.holdReel != null && opts.holdSymbol) {
    grid[opts.holdReel] = [opts.holdSymbol, opts.holdSymbol, opts.holdSymbol];
  }

  let expands = 0;
  if (opts.mode === "free") {
    const exp = applyExpandingLadders(grid);
    grid = exp.grid;
    expands = exp.expands;
  }

  let nudged = false;
  if (opts.mode === "base" && rng.chance(1 / 80)) {
    const miss = nearMissDice(grid);
    if (miss) {
      grid[miss.reel]![miss.row] = "dice";
      nudged = true;
    } else {
      // Nudge a high symbol onto a near-complete line (middle row).
      const high = rng.pick(HIGH_SYMBOLS.filter((s) => s !== "wild") as SymbolId[]);
      grid[4]![1] = high;
      nudged = true;
    }
  }

  const dice = countAnywhere(grid, "dice");
  const mini = countAnywhere(grid, "miniLadder");
  const { wins, pay } = evaluateLines(grid, opts.bet);
  const fiveKind = wins.some((w) => w.count === 5 && HIGH_SYMBOLS.includes(w.symbol));

  let feature: FeatureKind = "none";
  let freeSpinsAwarded = 0;
  let boardRollsAwarded = 0;
  let holdReel: number | null = null;

  if (opts.mode === "base") {
    if (dice >= 3) {
      feature = "board";
      boardRollsAwarded = boardRollsFromScatters(dice);
    } else if (mini >= 3) {
      feature = "freeSpins";
      freeSpinsAwarded = freeSpinsFromScatters(mini);
    } else if (fiveKind) {
      feature = "holdClimb";
      const w = wins.find((x) => x.count === 5)!;
      holdReel = 2; // lock the middle reel of the 5-kind
      // Prefer a reel that actually has the paying symbol.
      holdReel = w.cells[2]?.reel ?? 2;
    }
  } else if (opts.mode === "free" && mini >= 3) {
    feature = "freeSpins";
    freeSpinsAwarded = 5;
  }

  const snakePeek = feature !== "none" && opts.mode === "base" && rng.chance(0.72);

  const mult = opts.mode === "free" ? Math.max(1, opts.fsMultiplier ?? 1) : 1;
  const linePay = Math.round(pay * mult);
  const totalPay = linePay;

  return {
    grid,
    lineWins: wins,
    linePay,
    scatterDice: dice,
    scatterLadders: mini,
    feature,
    freeSpinsAwarded,
    boardRollsAwarded,
    holdReel,
    nudged,
    snakePeek,
    fiveKind,
    totalPay,
    multiplier: mult,
    expands,
  };
}

export function randomStrip(rng: Rng, len = 24, free = false): SymbolId[] {
  const w = free ? FREE_WEIGHTS : BASE_WEIGHTS;
  return Array.from({ length: len }, () => rng.weighted(w));
}
