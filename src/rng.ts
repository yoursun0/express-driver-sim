export function hashSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function nextRng(state: number): { state: number; n: number } {
  let a = state | 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  const n = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { state: a >>> 0, n };
}

export function rngInt(state: number, span: number): { state: number; n: number } {
  const roll = nextRng(state);
  return { state: roll.state, n: Math.floor(roll.n * span) };
}
