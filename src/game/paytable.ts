import { PAYS, PAYLINE_COUNT } from "./constants";
import type { Grid, LineWin, SymbolId } from "./types";

/** 20 fixed left-to-right paylines (row index per reel). */
export const PAYLINES: number[][] = [
  [1, 1, 1, 1, 1],
  [0, 0, 0, 0, 0],
  [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
  [0, 0, 1, 2, 2],
  [2, 2, 1, 0, 0],
  [1, 0, 0, 0, 1],
  [1, 2, 2, 2, 1],
  [0, 1, 1, 1, 0],
  [2, 1, 1, 1, 2],
  [1, 0, 1, 2, 1],
  [1, 2, 1, 0, 1],
  [0, 1, 0, 1, 0],
  [2, 1, 2, 1, 2],
  [0, 0, 0, 1, 2],
  [2, 2, 2, 1, 0],
  [1, 1, 0, 1, 1],
  [1, 1, 2, 1, 1],
  [0, 2, 0, 2, 0],
];

const SUBSTITUTABLE: SymbolId[] = [
  "wild",
  "ladder",
  "cobra",
  "banana",
  "basket",
  "ace",
  "king",
  "queen",
  "jack",
  "ten",
];

export function isScatter(id: SymbolId) {
  return id === "dice" || id === "miniLadder";
}

export function countAnywhere(grid: Grid, id: SymbolId) {
  let n = 0;
  for (const reel of grid) for (const s of reel) if (s === id) n += 1;
  return n;
}

function lineMatch(grid: Grid, rows: number[]): { symbol: SymbolId; count: number } | null {
  const cells = rows.map((row, reel) => grid[reel]![row]!);
  let paying: SymbolId | null = null;
  for (const s of cells) {
    if (s === "wild") continue;
    if (isScatter(s)) {
      if (paying && paying !== s) return null;
      // scatters don't pay on lines
      return null;
    }
    paying = s;
    break;
  }
  if (!paying) {
    // all wilds
    paying = "wild";
  }
  if (!SUBSTITUTABLE.includes(paying) && paying !== "wild") return null;
  let count = 0;
  for (const s of cells) {
    if (s === paying || s === "wild") count += 1;
    else break;
  }
  if (count < 2) return null;
  const table = PAYS[paying];
  const key = count as 2 | 3 | 4 | 5;
  if (!table[key]) return null;
  return { symbol: paying, count };
}

export function evaluateLines(grid: Grid, totalBet: number): { wins: LineWin[]; pay: number } {
  const lineBet = totalBet / PAYLINE_COUNT;
  const wins: LineWin[] = [];
  let pay = 0;
  for (let i = 0; i < PAYLINES.length; i++) {
    const rows = PAYLINES[i]!;
    const match = lineMatch(grid, rows);
    if (!match) continue;
    const mult = PAYS[match.symbol][match.count as 2 | 3 | 4 | 5] ?? 0;
    if (mult <= 0) continue;
    const amount = Math.round(mult * lineBet);
    pay += amount;
    const cells = [];
    for (let r = 0; r < match.count; r++) cells.push({ reel: r, row: rows[r]! });
    wins.push({ line: i, symbol: match.symbol, count: match.count, cells, pay: amount });
  }
  return { wins, pay };
}

export function freeSpinsFromScatters(n: number) {
  if (n >= 5) return 15;
  if (n >= 4) return 12;
  if (n >= 3) return 8;
  return 0;
}

export function boardRollsFromScatters(n: number) {
  if (n >= 5) return 16;
  if (n >= 4) return 12;
  if (n >= 3) return 10;
  return 0;
}
