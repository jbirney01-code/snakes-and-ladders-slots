import type { Mission, SaveState, Settings, SkinId, SymbolId } from "./types";
import { publicUrl } from "./publicUrl";

export const APP_NAME = "Snakes & Ladders Slots";
export const TAGLINE = "Climb. Slide. Celebrate.";
export const LEGAL =
  "Snakes & Ladders Slots is a social entertainment game. Ladder Coins have no real-world value and cannot be redeemed for cash or prizes.";

export const SAVE_KEY = "slslots.save.v1";
export const SAVE_VERSION = 1;

export const BET_STEPS = [100, 200, 500, 1000, 2000, 5000, 10000, 25000, 50000] as const;
export const START_LC = 50_000;
export const START_DT = 3;
export const CONSOLATION_LC = 5_000;
export const CONSOLATION_MS = 8 * 60 * 60 * 1000;
export const MAX_LEVEL = 50;
export const MAX_FS_MULT = 10;
export const MAX_FS_TOTAL = 25;
export const MAX_BOARD_WIN_X = 5000;

export const REELS = 5;
export const ROWS = 3;
export const PAYLINE_COUNT = 20;

export const HIGH_SYMBOLS: SymbolId[] = ["wild", "ladder", "cobra", "banana", "basket"];
export const LOW_SYMBOLS: SymbolId[] = ["ace", "king", "queen", "jack", "ten"];

export const SKIN_UNLOCK: Record<SkinId, number> = {
  wood: 1,
  crown: 8,
  frog: 16,
  candy: 28,
  neon: 40,
};

export const SKIN_LABEL: Record<SkinId, string> = {
  wood: "Classic Wood",
  crown: "Gold Crown",
  frog: "Jungle Frog",
  candy: "Candy",
  neon: "Neon Night",
};

export const DEFAULT_SETTINGS: Settings = {
  music: false,
  sfx: true,
  haptics: true,
  reducedMotion: false,
  turboDefault: false,
  captions: true,
};

export const DEFAULT_MISSIONS: Mission[] = [
  { id: "spins", title: "Spin 50 times", target: 50, progress: 0, rewardLc: 2500, rewardXp: 80, claimed: false },
  { id: "feature", title: "Trigger any feature", target: 1, progress: 0, rewardLc: 4000, rewardXp: 120, claimed: false },
  { id: "lineHits", title: "Win 10 line hits", target: 10, progress: 0, rewardLc: 2000, rewardXp: 60, claimed: false },
];

export const FRIEND_NAMES = [
  "Sly Snake",
  "Lucky Ladder",
  "Dice Dana",
  "Banana Bill",
  "Cobra Kim",
  "Crown Carl",
  "Meeple Mo",
  "Jungle Jess",
];


export const SYMBOL_LABEL: Record<SymbolId, string> = {
  wild: "Golden Gorilla Token",
  ladder: "Crown Ladder",
  cobra: "Emerald Cobra",
  banana: "Banana Bundle",
  basket: "Woven Basket",
  ace: "Ace Tile",
  king: "King Tile",
  queen: "Queen Tile",
  jack: "Jack Tile",
  ten: "Ten Tile",
  dice: "Scatter Dice",
  miniLadder: "Mini Ladder",
};

export const SYMBOL_SPRITE: Record<SymbolId, string> = {
  wild: publicUrl("/sprites/wild.png"),
  ladder: publicUrl("/sprites/ladder.png"),
  cobra: publicUrl("/sprites/cobra.png"),
  banana: publicUrl("/sprites/banana.png"),
  basket: publicUrl("/sprites/basket.png"),
  ace: publicUrl("/sprites/tile.png"),
  king: publicUrl("/sprites/tile.png"),
  queen: publicUrl("/sprites/tile.png"),
  jack: publicUrl("/sprites/tile.png"),
  ten: publicUrl("/sprites/tile.png"),
  dice: publicUrl("/sprites/dice.png"),
  miniLadder: publicUrl("/sprites/mini-ladder.png"),
};

export const TILE_LETTER: Partial<Record<SymbolId, string>> = {
  ace: "A",
  king: "K",
  queen: "Q",
  jack: "J",
  ten: "10",
};

export const TILE_FACE: Partial<Record<SymbolId, { top: string; bot: string; ink: string }>> = {
  ace: { top: "#ffe08a", bot: "#d49a12", ink: "#3A2040" },
  king: { top: "#fff6ec", bot: "#cbbba8", ink: "#3A2040" },
  queen: { top: "#ffb3c7", bot: "#ff5a8a", ink: "#3A2040" },
  jack: { top: "#7dffc4", bot: "#2ecc71", ink: "#0B1220" },
  ten: { top: "#243044", bot: "#0b1220", ink: "#FFC14A" },
};

/** Line pays as multiples of line bet (totalBet / 20). */
export const PAYS: Record<SymbolId, Partial<Record<2 | 3 | 4 | 5, number>>> = {
  wild: { 2: 8, 3: 30, 4: 80, 5: 250 },
  ladder: { 2: 5, 3: 20, 4: 50, 5: 150 },
  cobra: { 2: 4, 3: 16, 4: 40, 5: 120 },
  banana: { 2: 3, 3: 12, 4: 30, 5: 80 },
  basket: { 2: 2, 3: 10, 4: 25, 5: 60 },
  ace: { 3: 6, 4: 16, 5: 40 },
  king: { 3: 5, 4: 14, 5: 32 },
  queen: { 3: 4, 4: 12, 5: 28 },
  jack: { 3: 3, 4: 10, 5: 22 },
  ten: { 3: 3, 4: 8, 5: 18 },
  dice: {},
  miniLadder: {},
};

export const BASE_WEIGHTS: Record<SymbolId, number> = {
  ten: 16,
  jack: 14,
  queen: 13,
  king: 12,
  ace: 11,
  basket: 9,
  banana: 8,
  cobra: 6.5,
  ladder: 5.5,
  wild: 3.2,
  miniLadder: 3.6,
  dice: 3.8,
};

export const FREE_WEIGHTS: Record<SymbolId, number> = {
  ten: 12,
  jack: 11,
  queen: 10,
  king: 10,
  ace: 10,
  basket: 9,
  banana: 9,
  cobra: 8,
  ladder: 10,
  wild: 6,
  miniLadder: 3.2,
  dice: 0.4,
};

export function xpToNext(level: number): number {
  return Math.round(80 + level * 55 + level * level * 4);
}

export function levelReward(level: number): { lc: number; dt: number; skin?: SkinId } {
  const lc = 1500 + level * 400;
  const dt = level % 5 === 0 ? 1 : 0;
  const skin = (Object.entries(SKIN_UNLOCK) as [SkinId, number][]).find(([, lv]) => lv === level)?.[0];
  return { lc, dt, skin };
}

export function defaultSave(): SaveState {
  return {
    version: SAVE_VERSION,
    ageOk: false,
    tutorialDone: false,
    boardsSeen: 0,
    lc: START_LC,
    dt: START_DT,
    level: 1,
    xp: 0,
    betIndex: 0,
    skin: "wood",
    unlockedSkins: ["wood"],
    spins: 0,
    features: 0,
    lineHits: 0,
    bestClimb: 1,
    biggestPot: 0,
    biggestWin: 0,
    daily: { streak: 0, lastClaimDay: "", lastWheelDay: "", freezeUntil: 0 },
    missions: DEFAULT_MISSIONS.map((m) => ({ ...m })),
    missionDay: "",
    lastConsolation: 0,
    settings: { ...DEFAULT_SETTINGS },
    leaderToday: [],
    leaderWeek: [],
    leaderAll: [],
    leaderDayKey: "",
    leaderWeekKey: "",
    sharePayload: null,
  };
}

export function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function weekKey(d = new Date()): string {
  const tmp = new Date(d);
  const day = (tmp.getDay() + 6) % 7;
  tmp.setDate(tmp.getDate() - day);
  return todayKey(tmp);
}
