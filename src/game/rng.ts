/** Mulberry32 + simple helpers. Seeded enough to feel varied, not a PRNG showcase. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function makeRng(seed?: number) {
  const s = seed ?? (Math.floor(Math.random() * 0xffffffff) ^ Date.now());
  const next = mulberry32(s);
  return {
    seed: s,
    next,
    float(min = 0, max = 1) {
      return min + next() * (max - min);
    },
    int(min: number, max: number) {
      return min + Math.floor(next() * (max - min + 1));
    },
    chance(p: number) {
      return next() < p;
    },
    pick<T>(arr: readonly T[]): T {
      return arr[Math.floor(next() * arr.length)]!;
    },
    weighted<T extends string>(weights: Record<T, number>): T {
      let total = 0;
      for (const k in weights) total += weights[k]!;
      let r = next() * total;
      for (const k in weights) {
        r -= weights[k]!;
        if (r <= 0) return k;
      }
      return Object.keys(weights)[0] as T;
    },
  };
}

export type Rng = ReturnType<typeof makeRng>;
