/** Simple seeded pseudo-random number generator (mulberry32). */ export function createRandom(
  seed: number,
) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** Deterministic choice from an array using a seeded generator. */ export function seededPick<
  T,
>(rng: () => number, items: T[]): T {
  if (items.length === 0) throw new Error("Cannot pick from empty array");
  return items[Math.floor(rng() * items.length)];
}
/** Deterministic boolean using a seeded generator. */ export function seededBool(
  rng: () => number,
  probability = 0.5,
): boolean {
  return rng() < probability;
}
/** Deterministic float in [min, max) using a seeded generator. */ export function seededRange(
  rng: () => number,
  min: number,
  max: number,
): number {
  return min + rng() * (max - min);
}
/** Deterministic integer in [min, max] using a seeded generator. */ export function seededInt(
  rng: () => number,
  min: number,
  max: number,
): number {
  return Math.floor(seededRange(rng, min, max + 1));
}
