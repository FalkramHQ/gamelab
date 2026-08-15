/** Deterministic seeded RNG (mulberry32) + helpers mirroring Python's random usage. */
export interface Rng {
  random(): number;
  shuffle<T>(arr: T[]): T[];
  choice<T>(arr: T[]): T;
}

export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  const random = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const shuffle = <T>(arr: T[]): T[] => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };
  const choice = <T>(arr: T[]): T => arr[Math.floor(random() * arr.length)];
  return { random, shuffle, choice };
}
