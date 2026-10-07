/**
 * Deterministic randomness. Every imperfection in the notebook (a page's tilt,
 * a word's baseline, the wobble of an underline) is derived from a stable seed
 * so it looks hand-made but never shifts between renders.
 */

export function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export type Rng = {
  next: () => number;
  range: (min: number, max: number) => number;
  pick: <T>(items: readonly T[]) => T;
  chance: (p: number) => boolean;
};

export function rng(seed: string | number): Rng {
  let a = typeof seed === 'number' ? seed >>> 0 : hash(seed);
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (min, max) => min + next() * (max - min),
    pick: (items) => items[Math.floor(next() * items.length)],
    chance: (p) => next() < p,
  };
}

/** A small, stable rotation in degrees. Kept tiny so nothing reads as broken. */
export function tilt(seed: string, max = 0.8): number {
  return rng(`tilt:${seed}`).range(-max, max);
}
