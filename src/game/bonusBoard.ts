import { MAX_BOARD_WIN_X } from "./constants";
import type { BoardEvent, BoardPortal, BoardPrizeKind, BoardState } from "./types";
import type { Rng } from "./rng";

export const BOARD_SIZE = 100;

export const LADDERS: BoardPortal[] = [
  { from: 4, to: 14, kind: "ladder" },
  { from: 9, to: 31, kind: "ladder" },
  { from: 20, to: 38, kind: "ladder" },
  { from: 28, to: 84, kind: "ladder" },
  { from: 40, to: 59, kind: "ladder" },
  { from: 51, to: 67, kind: "ladder" },
  { from: 63, to: 81, kind: "ladder" },
  { from: 71, to: 91, kind: "ladder" },
];

export const SNAKES: BoardPortal[] = [
  { from: 17, to: 7, kind: "snake" },
  { from: 54, to: 34, kind: "snake" },
  { from: 62, to: 19, kind: "snake" },
  { from: 64, to: 60, kind: "snake" },
  { from: 87, to: 24, kind: "snake" },
  { from: 93, to: 73, kind: "snake" },
  { from: 95, to: 75, kind: "snake" },
  { from: 99, to: 78, kind: "snake" },
];

export const PORTALS = [...LADDERS, ...SNAKES];

const PORTAL_FROM = new Set(PORTALS.map((p) => p.from));

/** Prize map: squares that are not portal starts. */
export const PRIZES: Record<number, BoardPrizeKind> = {
  3: "bagS",
  6: "extra",
  8: "bagS",
  12: "bagM",
  15: "x2",
  18: "bagS",
  22: "miniJP",
  25: "bagM",
  27: "extra",
  33: "bagL",
  36: "x3",
  42: "bagS",
  45: "bagM",
  48: "extra",
  50: "majorJP",
  53: "bagS",
  57: "x2",
  61: "bagM",
  66: "bagS",
  69: "x5",
  72: "bagL",
  76: "miniJP",
  80: "bagM",
  83: "extra",
  86: "bagS",
  88: "x3",
  90: "bagL",
  94: "bagM",
  97: "bagS",
};

export function prizeAmount(kind: BoardPrizeKind, bet: number): number {
  switch (kind) {
    case "bagS":
      return Math.round(bet * 3);
    case "bagM":
      return Math.round(bet * 10);
    case "bagL":
      return Math.round(bet * 25);
    case "miniJP":
      return Math.round(bet * 50);
    case "majorJP":
      return Math.round(bet * 150);
    default:
      return 0;
  }
}

export function squarePos(n: number): { col: number; row: number } {
  const idx = Math.max(0, Math.min(BOARD_SIZE - 1, n - 1));
  const rowFromBottom = Math.floor(idx / 10);
  const colInRow = idx % 10;
  const col = rowFromBottom % 2 === 0 ? colInRow : 9 - colInRow;
  const row = 9 - rowFromBottom; // 0 at top
  return { col, row };
}

/** Consecutive squares between from (exclusive) and to (inclusive) along the track. */
export function hopSteps(from: number, to: number): number[] {
  const steps: number[] = [];
  if (to === from) return steps;
  const dir = to > from ? 1 : -1;
  for (let s = from + dir; dir > 0 ? s <= to : s >= to; s += dir) steps.push(s);
  return steps;
}

export function createBoard(rolls: number): BoardState {
  return {
    square: 1,
    rollsLeft: rolls,
    rollsUsed: 0,
    rollsAwarded: rolls,
    pot: 0,
    multipliers: [],
    finished: false,
    spentDt: false,
    events: [],
    skipAnim: false,
  };
}

function portalAt(square: number): BoardPortal | undefined {
  return PORTALS.find((p) => p.from === square);
}

function collectPrize(square: number, bet: number): { kind: BoardPrizeKind; amount: number; extra: boolean; mult: number } {
  if (PORTAL_FROM.has(square)) {
    return { kind: "none", amount: 0, extra: false, mult: 1 };
  }
  const kind = PRIZES[square] ?? "none";
  const amount = prizeAmount(kind, bet);
  const extra = kind === "extra";
  const mult = kind === "x2" ? 2 : kind === "x3" ? 3 : kind === "x5" ? 5 : 1;
  return { kind, amount, extra, mult };
}

export function finishBonus(remainingRolls: number, bet: number): number {
  const t = Math.min(1, remainingRolls / 8);
  const x = 200 + Math.round(300 * t);
  return Math.round(bet * x);
}

/** Play one dice roll, mutating state and returning the events for presentation. */
export function playRoll(state: BoardState, rng: Rng, bet: number): BoardEvent[] {
  if (state.finished || state.rollsLeft <= 0) {
    state.finished = true;
    return [{ type: "done" }];
  }
  const events: BoardEvent[] = [];
  const dieA = rng.int(1, 6);
  const dieB = rng.int(1, 6);
  const total = dieA + dieB;
  events.push({ type: "roll", dieA, dieB, total });
  state.rollsLeft -= 1;
  state.rollsUsed += 1;

  const from = state.square;
  let dest = from + total;
  if (dest >= BOARD_SIZE) {
    dest = BOARD_SIZE;
  }
  events.push({ type: "hop", from, to: dest });
  state.square = dest;

  if (dest >= BOARD_SIZE) {
    const bonus = finishBonus(state.rollsLeft, bet);
    events.push({ type: "finish", bonus });
    state.pot += bonus;
    state.finished = true;
    events.push({ type: "done" });
    state.events.push(...events);
    return events;
  }

  const portal = portalAt(state.square);
  if (portal) {
    if (portal.kind === "ladder") events.push({ type: "climb", from: portal.from, to: portal.to });
    else events.push({ type: "slide", from: portal.from, to: portal.to });
    state.square = portal.to;
  }

  const prize = collectPrize(state.square, bet);
  if (prize.amount > 0) {
    state.pot += prize.amount;
    events.push({ type: "prize", square: state.square, kind: prize.kind, amount: prize.amount });
  }
  if (prize.mult > 1) {
    state.multipliers.push(prize.mult);
    events.push({ type: "mult", value: prize.mult });
  }
  if (prize.extra) {
    state.rollsLeft += 1;
    state.rollsAwarded += 1;
    events.push({ type: "extra" });
  }

  if (state.rollsLeft <= 0) {
    state.finished = true;
    events.push({ type: "done" });
  }
  state.events.push(...events);
  return events;
}

/** Multipliers apply to the FINAL pot (product, capped at advertised 5,000× bet). */
export function finalPot(state: BoardState, bet = 100): number {
  let m = 1;
  for (const x of state.multipliers) m *= x;
  m = Math.min(m, 20);
  const raw = Math.round(state.pot * m);
  return Math.min(raw, bet * MAX_BOARD_WIN_X);
}
