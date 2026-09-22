import { create } from "zustand";
import {
  BET_STEPS,
  CONSOLATION_LC,
  CONSOLATION_MS,
  MAX_FS_MULT,
  MAX_FS_TOTAL,
  defaultSave,
  levelReward,
  todayKey,
  xpToNext,
} from "./constants";
import { createBoard, finalPot, playRoll } from "./bonusBoard";
import { makeRng } from "./rng";
import { loadSave, persistSave, recordPot, schedulePersist } from "./save";
import { spinOnce } from "./reelEngine";
import {
  haptic,
  setMusicEnabled,
  setSfxEnabled,
  sfxClick,
  sfxDice,
  sfxFanfare,
  sfxLadder,
  sfxRiser,
  sfxSnake,
  sfxSpin,
  sfxWinBig,
  sfxWinSmall,
  unlockAudio,
} from "./audio";
import type {
  AutoSpin,
  BoardState,
  FeatureKind,
  FreeSpinState,
  OverlayId,
  SaveState,
  ScreenId,
  Settings,
  SharePayload,
  SkinId,
  SpinResult,
  SymbolId,
} from "./types";

export type DailyReward = { label: string; lc: number; dt: number; miniBoard: boolean };

type LevelUp = { level: number; lc: number; dt: number; skin?: SkinId };

type XpPatch = {
  xp: number;
  level: number;
  lc: number;
  dt: number;
  unlockedSkins: SkinId[];
  levelUp: LevelUp | null;
};

function applyXp(p: XpPatch, amount: number): XpPatch {
  const next = { ...p, unlockedSkins: [...p.unlockedSkins] };
  next.xp += amount;
  let guard = 0;
  while (next.level < 50 && next.xp >= xpToNext(next.level) && guard++ < 20) {
    next.xp -= xpToNext(next.level);
    next.level += 1;
    const r = levelReward(next.level);
    next.lc += r.lc;
    next.dt += r.dt;
    if (r.skin && !next.unlockedSkins.includes(r.skin)) next.unlockedSkins.push(r.skin);
    next.levelUp = { level: next.level, lc: r.lc, dt: r.dt, skin: r.skin };
  }
  return next;
}

export type GameStore = SaveState & {
  hydrated: boolean;
  screen: ScreenId;
  overlay: OverlayId;
  spinning: boolean;
  turbo: boolean;
  holdingTurbo: boolean;
  auto: AutoSpin;
  lastResult: SpinResult | null;
  pendingResult: SpinResult | null;
  winMeter: number;
  free: FreeSpinState | null;
  board: BoardState | null;
  boardBet: number;
  boardStarted: boolean;
  hold: { reel: number; symbol: SymbolId } | null;
  drySpins: number;
  caption: string;
  levelUp: LevelUp | null;
  bigWin: { amount: number; kind: "big" | "mega" } | null;
  debug: boolean;
  dailyReward: DailyReward | null;
  spinNonce: number;
  lastEvents: import("./types").BoardEvent[];

  hydrate: () => void;
  persistSlice: () => void;
  acceptAge: () => void;
  finishSplash: () => void;
  enterTable: () => void;
  enterLobby: () => void;
  setOverlay: (o: OverlayId) => void;
  setBetIndex: (i: number) => void;
  bumpBet: (dir: 1 | -1) => void;
  maxBet: () => void;
  setTurbo: (on: boolean) => void;
  setHoldingTurbo: (on: boolean) => void;
  spin: (force?: { feature?: FeatureKind }) => boolean;
  onReelsLanded: () => void;
  skipWin: () => void;
  startAuto: (n: number) => void;
  stopAuto: () => void;
  setSetting: <K extends keyof Settings>(k: K, v: Settings[K]) => void;
  claimMission: (id: SaveState["missions"][number]["id"]) => void;
  spinDailyWheel: () => DailyReward | null;
  claimConsolation: () => boolean;
  spendDtOnBoard: () => void;
  startBoard: () => void;
  playBoard: () => void;
  skipBoardAnim: () => void;
  finishBoard: () => void;
  setSkin: (id: SkinId) => void;
  replayTutorial: () => void;
  dismissTutorial: () => void;
  dismissLevelUp: () => void;
  dismissBigWin: () => void;
  dismissShare: () => void;
  setShare: (p: SharePayload) => void;
  addDebugLc: (n: number) => void;
  debugSkipSquare: (n: number) => void;
  debugForce: (f: FeatureKind) => void;
};

function saveFields(s: GameStore): SaveState {
  const d = defaultSave();
  const out = { ...d };
  (Object.keys(d) as (keyof SaveState)[]).forEach((k) => {
    (out as Record<string, unknown>)[k] = s[k];
  });
  return out;
}

function bumpMissions(
  missions: SaveState["missions"],
  id: SaveState["missions"][number]["id"],
  n = 1,
) {
  return missions.map((m) =>
    m.id === id ? { ...m, progress: Math.min(m.target, m.progress + n) } : m,
  );
}

let autoTimer: number | null = null;
function later(fn: () => void, ms: number) {
  if (autoTimer) window.clearTimeout(autoTimer);
  autoTimer = window.setTimeout(fn, ms);
}

export const useGame = create<GameStore>((set, get) => ({
  ...defaultSave(),
  hydrated: false,
  screen: "age",
  overlay: null,
  spinning: false,
  turbo: false,
  holdingTurbo: false,
  auto: null,
  lastResult: null,
  pendingResult: null,
  winMeter: 0,
  free: null,
  board: null,
  boardBet: 100,
  boardStarted: false,
  hold: null,
  drySpins: 0,
  caption: "",
  levelUp: null,
  bigWin: null,
  debug: false,
  dailyReward: null,
  spinNonce: 0,
  lastEvents: [],

  hydrate: () => {
    const loaded = loadSave();
    const debug =
      typeof window !== "undefined" && new URLSearchParams(window.location.search).has("debug");
    const reduced =
      loaded.settings.reducedMotion ||
      (typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
    set({
      ...loaded,
      settings: { ...loaded.settings, reducedMotion: reduced, music: false },
      hydrated: true,
      screen: loaded.ageOk ? "lobby" : "splash",
      overlay: loaded.ageOk && !loaded.tutorialDone ? "tutorial" : null,
      turbo: loaded.settings.turboDefault,
      debug,
    });
    setMusicEnabled(false);
    setSfxEnabled(loaded.settings.sfx);
  },

  persistSlice: () => persistSave(saveFields(get())),

  acceptAge: () => {
    set({ ageOk: true, screen: "splash" });
    get().persistSlice();
  },

  finishSplash: () => {
    const s = get();
    set({ ageOk: true, screen: "lobby", overlay: s.tutorialDone ? null : "tutorial" });
    get().persistSlice();
  },

  enterTable: () => set({ screen: "table" }),
  enterLobby: () => set({ screen: "lobby", auto: null, spinning: false, free: null, hold: null }),
  setOverlay: (overlay) => {
    sfxClick();
    set({ overlay });
  },

  setBetIndex: (i) => {
    set({ betIndex: Math.max(0, Math.min(BET_STEPS.length - 1, i)) });
    get().persistSlice();
  },
  bumpBet: (dir) => {
    sfxClick();
    get().setBetIndex(get().betIndex + dir);
  },
  maxBet: () => {
    sfxClick();
    get().setBetIndex(BET_STEPS.length - 1);
  },
  setTurbo: (turbo) => set({ turbo }),
  setHoldingTurbo: (holdingTurbo) => set({ holdingTurbo }),

  spin: (force) => {
    const s = get();
    if (s.spinning) return false;
    if (s.screen !== "table") return false;

    const inFree = !!s.free && s.free.remaining > 0;
    const inHold = !!s.hold;
    const bet = BET_STEPS[s.betIndex]!;

    if (!inFree && s.lc < bet) {
      set({ overlay: "outofcoins", auto: null });
      return false;
    }

    unlockAudio();
    if (s.settings.haptics) haptic(10);
    sfxSpin();

    const spent = inFree ? 0 : bet;
    const result = spinOnce({
      bet,
      mode: inFree ? "free" : inHold ? "hold" : "base",
      spinIndex: s.spins,
      drySpins: s.drySpins,
      fsMultiplier: s.free?.multiplier ?? 1,
      holdReel: s.hold?.reel,
      holdSymbol: s.hold?.symbol,
      force,
    });

    const nextFree = s.free
      ? { ...s.free, remaining: Math.max(0, s.free.remaining - (inFree ? 1 : 0)) }
      : null;

    const xp = applyXp(
      {
        xp: s.xp,
        level: s.level,
        lc: s.lc - spent,
        dt: s.dt,
        unlockedSkins: s.unlockedSkins,
        levelUp: s.levelUp,
      },
      inFree ? 6 : 4,
    );

    set({
      spinning: true,
      pendingResult: result,
      lastResult: result,
      winMeter: 0,
      hold: inHold ? null : s.hold,
      free: nextFree,
      spins: s.spins + 1,
      caption: result.snakePeek ? "Something slithers…" : result.nudged ? "Lucky nudge!" : "",
      spinNonce: s.spinNonce + 1,
      missions: bumpMissions(s.missions, "spins", 1),
      ...xp,
    });
    schedulePersist(saveFields(get()));
    return true;
  },

  onReelsLanded: () => {
    const s = get();
    const result = s.pendingResult;
    if (!result) {
      set({ spinning: false });
      return;
    }

    const bet = BET_STEPS[s.betIndex]!;
    const pay = result.totalPay;
    if (pay > 0) {
      if (pay >= bet * 20) sfxWinBig();
      else sfxWinSmall();
      if (s.settings.haptics) haptic(pay >= bet * 20 ? 40 : 16);
    } else if (result.scatterDice >= 2) {
      sfxDice();
    }

    let missions = s.missions;
    if (result.lineWins.length) missions = bumpMissions(missions, "lineHits", result.lineWins.length);

    let free = s.free;
    let features = s.features;
    let caption = s.caption;
    if (result.feature === "freeSpins" && result.freeSpinsAwarded > 0) {
      missions = bumpMissions(missions, "feature", 1);
      features += 1;
      if (!free) {
        free = {
          remaining: result.freeSpinsAwarded,
          totalAwarded: result.freeSpinsAwarded,
          multiplier: 1,
          expands: 0,
        };
      } else {
        const add = Math.min(MAX_FS_TOTAL - free.totalAwarded, result.freeSpinsAwarded);
        free = { ...free, remaining: free.remaining + add, totalAwarded: free.totalAwarded + add };
      }
      caption = `Ladder Climb! ${result.freeSpinsAwarded} free spins`;
    }
    if (free && result.expands > 0) {
      free = {
        ...free,
        expands: free.expands + result.expands,
        multiplier: Math.min(MAX_FS_MULT, free.multiplier + result.expands),
      };
      sfxLadder();
    }

    let hold = s.hold;
    if (result.feature === "holdClimb" && result.holdReel != null && !free) {
      const sym = result.lineWins.find((w) => w.count === 5)?.symbol ?? "ladder";
      hold = { reel: result.holdReel, symbol: sym };
      caption = "Hold the ladder.";
    }

    let bigWin = s.bigWin;
    if (pay >= bet * 200) bigWin = { amount: pay, kind: "mega" };
    else if (pay >= bet * 50) bigWin = { amount: pay, kind: "big" };

    let sharePayload = s.sharePayload;
    if (result.fiveKind) {
      sharePayload = {
        title: "Five of a kind!",
        subtitle: "Snakes & Ladders Slots",
        amount: pay,
        kind: "five",
      };
    }

    set({
      spinning: false,
      pendingResult: null,
      lastResult: result,
      lc: s.lc + pay,
      winMeter: pay,
      drySpins: pay > 0 ? 0 : s.drySpins + 1,
      free,
      hold,
      bigWin,
      biggestWin: Math.max(s.biggestWin, pay),
      features,
      missions,
      caption,
      sharePayload,
    });

    if (result.feature === "board" && result.boardRollsAwarded > 0) {
      missions = bumpMissions(get().missions, "feature", 1);
      const skipAnim = get().boardsSeen >= 3;
      const board = createBoard(result.boardRollsAwarded);
      board.skipAnim = skipAnim;
      set({
        board,
        boardBet: bet,
        boardStarted: false,
        screen: "board",
        auto: null,
        features: get().features,
        missions,
        caption: "Snakes & Ladders Board!",
      });
      sfxRiser();
      schedulePersist(saveFields(get()));
      return;
    }

    schedulePersist(saveFields(get()));

    const g = get();
    const turboish = g.turbo || g.holdingTurbo || g.settings.reducedMotion;
    const shouldContinue = (g.free && g.free.remaining > 0) || g.hold;
    if (g.auto && result.feature !== "none" && result.feature !== "holdClimb") {
      set({ auto: null });
    }

    if (shouldContinue) {
      later(() => {
        const cur = get();
        if (cur.screen !== "table" || cur.spinning) return;
        get().spin();
      }, turboish ? 200 : 700);
      return;
    }

    if (g.auto && g.auto.remaining > 1 && result.feature === "none") {
      set({ auto: { remaining: g.auto.remaining - 1, total: g.auto.total } });
      later(() => {
        const cur = get();
        if (!cur.auto || cur.spinning || cur.screen !== "table") return;
        get().spin();
      }, turboish ? 180 : 520);
    } else if (g.auto && g.auto.remaining <= 1) {
      set({ auto: null });
    }
  },

  skipWin: () => set({ bigWin: null }),
  startAuto: (n) => {
    sfxClick();
    set({ auto: { remaining: n, total: n } });
    if (!get().spinning) get().spin();
  },
  stopAuto: () => {
    if (autoTimer) window.clearTimeout(autoTimer);
    set({ auto: null });
  },

  setSetting: (k, v) => {
    const settings = { ...get().settings, [k]: k === "music" ? false : v };
    set({ settings });
    if (k === "music") setMusicEnabled(false);
    if (k === "sfx") setSfxEnabled(Boolean(v));
    if (k === "turboDefault") set({ turbo: Boolean(v) });
    get().persistSlice();
  },

  claimMission: (id) => {
    const s = get();
    const m = s.missions.find((x) => x.id === id);
    if (!m || m.claimed || m.progress < m.target) return;
    const xp = applyXp(
      {
        xp: s.xp,
        level: s.level,
        lc: s.lc + m.rewardLc,
        dt: s.dt,
        unlockedSkins: s.unlockedSkins,
        levelUp: s.levelUp,
      },
      m.rewardXp,
    );
    set({
      missions: s.missions.map((x) => (x.id === id ? { ...x, claimed: true } : x)),
      ...xp,
    });
    sfxWinSmall();
    get().persistSlice();
  },

  spinDailyWheel: () => {
    const s = get();
    const day = todayKey();
    if (s.daily.lastWheelDay === day) return null;
    const yesterday = (() => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return todayKey(d);
    })();
    const streak = s.daily.lastClaimDay === yesterday ? Math.min(7, s.daily.streak + 1) : 1;
    const rng = makeRng();
    let reward: DailyReward;
    if (streak >= 7) {
      const mini = rng.chance(0.5);
      reward = mini
        ? { label: "Mini Board — 5 rolls", lc: 0, dt: 0, miniBoard: true }
        : { label: "Fat $ sack", lc: 15000, dt: 0, miniBoard: false };
    } else {
      const table: DailyReward[] = [
        { label: "$1,000", lc: 1000, dt: 0, miniBoard: false },
        { label: "$2,000", lc: 2000, dt: 0, miniBoard: false },
        { label: "1 Dice Token", lc: 0, dt: 1, miniBoard: false },
        { label: "$3,500", lc: 3500, dt: 0, miniBoard: false },
        { label: "$500", lc: 500, dt: 0, miniBoard: false },
        { label: "2 Dice Tokens", lc: 0, dt: 2, miniBoard: false },
      ];
      reward = table[Math.min(streak, table.length) - 1] ?? table[0]!;
    }
    set({
      daily: { ...s.daily, streak, lastClaimDay: day, lastWheelDay: day },
      lc: s.lc + reward.lc,
      dt: s.dt + reward.dt,
      dailyReward: reward,
    });
    if (reward.miniBoard) {
      const bet = BET_STEPS[get().betIndex]!;
      const board = createBoard(5);
      board.skipAnim = get().boardsSeen >= 3;
      set({ board, boardBet: bet, boardStarted: false, screen: "board", overlay: null });
    }
    sfxFanfare();
    get().persistSlice();
    return reward;
  },

  claimConsolation: () => {
    const s = get();
    if (Date.now() - s.lastConsolation < CONSOLATION_MS) return false;
    if (s.lc >= BET_STEPS[0]!) return false;
    set({ lc: s.lc + CONSOLATION_LC, lastConsolation: Date.now(), overlay: null });
    get().persistSlice();
    return true;
  },

  spendDtOnBoard: () => {
    const s = get();
    if (!s.board || s.dt < 1 || s.board.spentDt) return;
    set({
      dt: s.dt - 1,
      board: {
        ...s.board,
        rollsLeft: s.board.rollsLeft + 2,
        rollsAwarded: s.board.rollsAwarded + 2,
        spentDt: true,
      },
    });
    sfxDice();
    get().persistSlice();
  },

  startBoard: () => {
    set({ boardStarted: true });
    get().playBoard();
  },

  playBoard: () => {
    const s = get();
    if (!s.board || s.board.finished) return;
    const rng = makeRng();
    const next: BoardState = {
      ...s.board,
      events: [...s.board.events],
      multipliers: [...s.board.multipliers],
    };
    const ev = playRoll(next, rng, s.boardBet);
    for (const e of ev) {
      if (e.type === "climb") sfxLadder();
      if (e.type === "slide") sfxSnake();
      if (e.type === "roll") sfxDice();
    }
    set({ board: next, lastEvents: ev, caption: `Square ${next.square}` });
  },

  skipBoardAnim: () => {
    const s = get();
    if (!s.board) return;
    set({ board: { ...s.board, skipAnim: true } });
  },

  finishBoard: () => {
    const s = get();
    if (!s.board) return;
    const pot = finalPot(s.board, s.boardBet);
    const sq = s.board.square;
    const snap = saveFields(s);
    snap.lc = s.lc + pot;
    snap.bestClimb = Math.max(s.bestClimb, sq);
    snap.biggestPot = Math.max(s.biggestPot, pot);
    snap.biggestWin = Math.max(s.biggestWin, pot);
    snap.boardsSeen = s.boardsSeen + 1;
    recordPot(snap, pot, sq);
    const xp = applyXp(
      {
        xp: snap.xp,
        level: snap.level,
        lc: snap.lc,
        dt: snap.dt,
        unlockedSkins: snap.unlockedSkins,
        levelUp: s.levelUp,
      },
      40 + Math.floor(pot / Math.max(1, s.boardBet)),
    );
    const bet = s.boardBet;
    const big = pot >= bet * 200 ? "mega" : pot >= bet * 50 ? "big" : null;
    set({
      ...snap,
      ...xp,
      board: null,
      boardStarted: false,
      screen: "table",
      bigWin: big ? { amount: pot, kind: big } : s.bigWin,
      sharePayload: {
        title: sq >= 100 ? "I finished the board!" : `I climbed to square ${sq}!`,
        subtitle: "Snakes & Ladders Slots",
        amount: pot,
        square: sq,
        kind: "board",
      },
      overlay: pot >= bet * 20 ? "share" : null,
      caption: `Board pot $${pot.toLocaleString()}`,
      lastEvents: [],
    });
    if (pot > 0) sfxFanfare();
    get().persistSlice();
  },

  setSkin: (id) => {
    if (!get().unlockedSkins.includes(id)) return;
    set({ skin: id });
    get().persistSlice();
  },
  replayTutorial: () => set({ overlay: "tutorial", tutorialDone: false }),
  dismissTutorial: () => {
    set({ overlay: null, tutorialDone: true });
    get().persistSlice();
  },
  dismissLevelUp: () => set({ levelUp: null }),
  dismissBigWin: () => set({ bigWin: null }),
  dismissShare: () => set({ overlay: null }),
  setShare: (p) => set({ sharePayload: p, overlay: "share" }),

  addDebugLc: (n) => {
    set({ lc: Math.max(0, get().lc + n) });
    get().persistSlice();
  },
  debugSkipSquare: (n) => {
    const s = get();
    if (!s.board) return;
    set({ board: { ...s.board, square: Math.max(1, Math.min(100, n)) } });
  },
  debugForce: (f) => {
    if (get().screen !== "table") set({ screen: "table", overlay: null });
    later(() => get().spin({ feature: f }), 50);
  },
}));

export function currentBet() {
  return BET_STEPS[useGame.getState().betIndex] ?? BET_STEPS[0]!;
}
