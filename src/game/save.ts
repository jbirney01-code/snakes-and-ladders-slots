import { defaultSave, DEFAULT_MISSIONS, SAVE_KEY, SAVE_VERSION, todayKey, weekKey } from "./constants";
import { hashSeed, makeRng } from "./rng";
import { FRIEND_NAMES } from "./constants";
import type { LeaderScore, SaveState } from "./types";

function mockRivals(seed: number, scale: number): LeaderScore[] {
  const rng = makeRng(seed);
  return FRIEND_NAMES.map((name) => ({
    name,
    pot: Math.round(rng.float(800, 42000) * scale),
    square: rng.int(12, 100),
    when: Date.now() - rng.int(0, 86_400_000),
  }));
}

function refreshLeaders(s: SaveState): SaveState {
  const day = todayKey();
  const week = weekKey();
  if (s.leaderDayKey !== day) {
    s.leaderToday = mockRivals(hashSeed(`day:${day}`), 0.6);
    s.leaderDayKey = day;
  }
  if (s.leaderWeekKey !== week) {
    s.leaderWeek = mockRivals(hashSeed(`week:${week}`), 1.1);
    s.leaderWeekKey = week;
  }
  if (s.leaderAll.length < 8) {
    s.leaderAll = mockRivals(hashSeed("all-time-rivals"), 1.8);
  }
  return s;
}

function refreshMissions(s: SaveState): SaveState {
  const day = todayKey();
  if (s.missionDay !== day) {
    s.missions = DEFAULT_MISSIONS.map((m) => ({ ...m }));
    s.missionDay = day;
  }
  return s;
}

export function migrate(raw: SaveState): SaveState {
  const base = defaultSave();
  const s = { ...base, ...raw, settings: { ...base.settings, ...(raw.settings ?? {}) } };
  s.version = SAVE_VERSION;
  if (!Array.isArray(s.unlockedSkins) || s.unlockedSkins.length === 0) s.unlockedSkins = ["wood"];
  if (!Array.isArray(s.missions)) s.missions = DEFAULT_MISSIONS.map((m) => ({ ...m }));
  return refreshMissions(refreshLeaders(s));
}

export function loadSave(): SaveState {
  if (typeof window === "undefined") return defaultSave();
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return refreshMissions(refreshLeaders(defaultSave()));
    const parsed = JSON.parse(raw) as SaveState;
    return migrate(parsed);
  } catch {
    return defaultSave();
  }
}

export function persistSave(state: SaveState) {
  if (typeof window === "undefined") return;
  try {
    const prev = window.localStorage.getItem(SAVE_KEY);
    if (prev) window.localStorage.setItem(SAVE_KEY + ".bak", prev);
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    // private mode / quota — keep playing in memory
  }
}

export function recordPot(s: SaveState, pot: number, square: number, name = "You") {
  const entry: LeaderScore = { name, pot, square, when: Date.now(), you: true };
  const insert = (list: LeaderScore[]) => {
    const next = list.filter((x) => !x.you).concat(entry);
    next.sort((a, b) => b.pot - a.pot);
    return next.slice(0, 10);
  };
  s.leaderToday = insert(s.leaderToday);
  s.leaderWeek = insert(s.leaderWeek);
  s.leaderAll = insert(s.leaderAll);
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
export function schedulePersist(state: SaveState) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => persistSave(state), 250);
}
