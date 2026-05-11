/**
 * Modular-arithmetic vortex engine. Given N (modulus) and a multiplier, walks
 * each residue class through its k → (k·multiplier mod N) image, identifies
 * loop cycles and feeder chains, and returns the decomposition.
 *
 * The algorithm matches the original `sacrifunk_vortex_v2.jsx` exactly; only
 * the type discipline and parameter names are tightened.
 */

export interface VortexResult {
  /** Closed loops — each loop is a list of residue classes in traversal order. */
  cycles: number[][];
  /** Residues outside any loop (`feeders`). */
  feeders: number[];
  /** Set of residues that belong to at least one cycle. */
  inCycle: Set<number>;
  /** Mapping k → (k · multiplier mod N). */
  mapping: Record<number, number>;
  /** Feeder chains — each chain ends with a residue inside a cycle. */
  chains: number[][];
  /** The modulus this result was computed for. */
  N: number;
}

const EMPTY: VortexResult = {
  cycles: [],
  feeders: [],
  inCycle: new Set(),
  mapping: {},
  chains: [],
  N: 0,
};

export function computeVortex(N: number, multiplier: number): VortexResult {
  if (N < 2) return EMPTY;

  const mod = (x: number): number => {
    const r = x % N;
    return r === 0 ? N : r;
  };

  const mapping: Record<number, number> = {};
  for (let k = 1; k <= N; k++) mapping[k] = mod(k * multiplier);

  const visited = new Set<number>();
  const inCycle = new Set<number>();
  const cycles: number[][] = [];

  for (let start = 1; start <= N; start++) {
    if (visited.has(start)) continue;
    const path: number[] = [];
    const pathSet = new Set<number>();
    let current = start;
    while (!visited.has(current) && !pathSet.has(current)) {
      path.push(current);
      pathSet.add(current);
      current = mapping[current];
    }
    if (pathSet.has(current)) {
      const idx = path.indexOf(current);
      const cycle = path.slice(idx);
      cycle.forEach((n) => inCycle.add(n));
      cycles.push(cycle);
    }
    path.forEach((n) => visited.add(n));
  }

  const feeders: number[] = [];
  for (let k = 1; k <= N; k++) if (!inCycle.has(k)) feeders.push(k);

  const chains: number[][] = [];
  const used = new Set<number>();
  for (const fn of feeders) {
    if (used.has(fn)) continue;
    const chain = [fn];
    used.add(fn);
    let cur = mapping[fn];
    while (!inCycle.has(cur) && !used.has(cur)) {
      chain.push(cur);
      used.add(cur);
      cur = mapping[cur];
    }
    chain.push(cur);
    chains.push(chain);
  }

  return { cycles, feeders, inCycle, mapping, chains, N };
}

/** Polar → cartesian for placing N nodes on a circle of radius `r`. */
export function nodePos(
  i: number,
  total: number,
  cx: number,
  cy: number,
  r: number,
): { x: number; y: number } {
  const angle = -Math.PI / 2 + (2 * Math.PI * (i - 1)) / total;
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

/** Greatest common divisor — Euclidean algorithm. */
export function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/**
 * Count how many generators trap residue `pos` inside their cycle (out of the
 * given list). Used by the N=12 stability colouring.
 */
export function stabilityScore(
  pos: number,
  generators: readonly number[],
  N: number,
): number {
  let score = 0;
  for (const g of generators) {
    const { inCycle } = computeVortex(N, g);
    if (inCycle.has(pos)) score++;
  }
  return score;
}
