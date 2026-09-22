export type SymbolId =
  | "wild"
  | "ladder"
  | "cobra"
  | "banana"
  | "basket"
  | "ace"
  | "king"
  | "queen"
  | "jack"
  | "ten"
  | "dice"
  | "miniLadder";

export type ScreenId = "age" | "splash" | "lobby" | "table" | "board";

export type OverlayId =
  | null
  | "paytable"
  | "settings"
  | "profile"
  | "daily"
  | "missions"
  | "leaderboard"
  | "getcoins"
  | "outofcoins"
  | "tutorial"
  | "share"
  | "skins"
  | "debug";

export type SkinId = "wood" | "crown" | "frog" | "candy" | "neon";

export type Grid = SymbolId[][]; // [reel][row] 5 x 3

export type LineWin = {
  line: number;
  symbol: SymbolId;
  count: number;
  cells: { reel: number; row: number }[];
  pay: number;
};

export type SpinMode = "base" | "free" | "hold";

export type FeatureKind = "none" | "freeSpins" | "board" | "holdClimb";

export type SpinResult = {
  grid: Grid;
  lineWins: LineWin[];
  linePay: number;
  scatterDice: number;
  scatterLadders: number;
  feature: FeatureKind;
  freeSpinsAwarded: number;
  boardRollsAwarded: number;
  holdReel: number | null;
  nudged: boolean;
  snakePeek: boolean;
  fiveKind: boolean;
  totalPay: number;
  multiplier: number;
  expands: number;
};

export type FreeSpinState = {
  remaining: number;
  totalAwarded: number;
  multiplier: number;
  expands: number;
};

export type BoardPortal = { from: number; to: number; kind: "ladder" | "snake" };

export type BoardPrizeKind =
  | "none"
  | "bagS"
  | "bagM"
  | "bagL"
  | "x2"
  | "x3"
  | "x5"
  | "extra"
  | "miniJP"
  | "majorJP";

export type BoardEvent =
  | { type: "roll"; dieA: number; dieB: number; total: number }
  | { type: "hop"; from: number; to: number }
  | { type: "climb"; from: number; to: number }
  | { type: "slide"; from: number; to: number }
  | { type: "prize"; square: number; kind: BoardPrizeKind; amount: number }
  | { type: "mult"; value: number }
  | { type: "extra" }
  | { type: "finish"; bonus: number }
  | { type: "done" };

export type BoardState = {
  square: number;
  rollsLeft: number;
  rollsUsed: number;
  rollsAwarded: number;
  pot: number;
  multipliers: number[];
  finished: boolean;
  spentDt: boolean;
  events: BoardEvent[];
  skipAnim: boolean;
};

export type MissionId = "spins" | "feature" | "lineHits";

export type Mission = {
  id: MissionId;
  title: string;
  target: number;
  progress: number;
  rewardLc: number;
  rewardXp: number;
  claimed: boolean;
};

export type DailyState = {
  streak: number;
  lastClaimDay: string;
  lastWheelDay: string;
  freezeUntil: number;
};

export type Settings = {
  music: boolean;
  sfx: boolean;
  haptics: boolean;
  reducedMotion: boolean;
  turboDefault: boolean;
  captions: boolean;
};

export type LeaderScore = {
  name: string;
  pot: number;
  square: number;
  when: number;
  you?: boolean;
};

export type SharePayload = {
  title: string;
  subtitle: string;
  amount: number;
  square?: number;
  kind: "board" | "spin" | "five";
};

export type SaveState = {
  version: number;
  ageOk: boolean;
  tutorialDone: boolean;
  boardsSeen: number;
  lc: number;
  dt: number;
  level: number;
  xp: number;
  betIndex: number;
  skin: SkinId;
  unlockedSkins: SkinId[];
  spins: number;
  features: number;
  lineHits: number;
  bestClimb: number;
  biggestPot: number;
  biggestWin: number;
  daily: DailyState;
  missions: Mission[];
  missionDay: string;
  lastConsolation: number;
  settings: Settings;
  leaderToday: LeaderScore[];
  leaderWeek: LeaderScore[];
  leaderAll: LeaderScore[];
  leaderDayKey: string;
  leaderWeekKey: string;
  sharePayload: SharePayload | null;
};

export type AutoSpin = {
  remaining: number;
  total: number;
} | null;
