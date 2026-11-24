import type { State } from "./types";

export const SAVE_KEY = "eds-v1";

export interface Kv {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class MemoryStorage implements Kv {
  readonly map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
}

interface Envelope {
  v: 1;
  state: State;
}

export function saveShift(store: Kv, state: State): void {
  const body: Envelope = { v: 1, state };
  store.setItem(SAVE_KEY, JSON.stringify(body));
}

export function loadShift(store: Kv): State | null {
  const raw = store.getItem(SAVE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<Envelope>;
    if (parsed.v !== 1 || !parsed.state) return null;
    if (parsed.state.version !== 1) return null;
    return parsed.state;
  } catch {
    return null;
  }
}

export function clearShift(store: Kv): void {
  store.removeItem(SAVE_KEY);
}
