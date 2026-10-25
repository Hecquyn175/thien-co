/**
 * PRNG có seed (mulberry32) và hàm hash chuỗi (xmur3 / FNV-1a).
 * Tuyệt đối không dùng Math.random() trong engine.
 */

export function hashString(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h += h << 13;
  h ^= h >>> 7;
  h += h << 3;
  h ^= h >>> 17;
  h += h << 5;
  return h >>> 0;
}

/** Mulberry32 PRNG trả về hàm sinh số thực trong [0, 1). */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createSeededRng(seedStr: string): () => number {
  return createRng(hashString(seedStr));
}

export function pickDeterministic<T>(items: readonly T[], seedStr: string): T {
  if (items.length === 0) {
    throw new Error('pickDeterministic: mảng rỗng');
  }
  const rng = createSeededRng(seedStr);
  const idx = Math.floor(rng() * items.length);
  return items[idx];
}
