import { describe, expect, test } from "bun:test";
import { CODE_RE, PLATE_RE, TAIL_RE, makeCode, makePlate, makeTail } from "../src/city";
import { hashSeed } from "../src/rng";
import { startShift } from "../src/sim";
import { SAVE_KEY, loadShift, saveShift, MemoryStorage } from "../src/storage";

describe("save and identifiers", () => {
  test("localStorage round trip keeps an in-progress shift", () => {
    const store = new MemoryStorage();
    let state = startShift("night", "save-seed");
    state = { ...state, phase: "pickup", toast: "去接乘客" };
    saveShift(store, state);
    expect(store.map.has(SAVE_KEY)).toBe(true);
    const loaded = loadShift(store);
    expect(loaded?.phase).toBe("pickup");
    expect(loaded?.seed).toBe("save-seed");
    expect(loaded?.shift).toBe("night");
    expect(loaded?.offers.length).toBe(state.offers.length);
    expect(loaded?.offers[1]?.category).toBe("特惠");
    expect(loaded?.toast).toBe("去接乘客");
  });

  test("bad payloads do not restore", () => {
    const store = new MemoryStorage();
    store.setItem(SAVE_KEY, "{");
    expect(loadShift(store)).toBeNull();
    store.setItem(SAVE_KEY, JSON.stringify({ v: 2, state: { version: 1 } }));
    expect(loadShift(store)).toBeNull();
  });

  test("plates and phone tails stay fictional", () => {
    let rng = hashSeed("plates");
    for (let i = 0; i < 40; i++) {
      const plate = makePlate(rng);
      rng = plate.rng;
      expect(plate.plate).toMatch(PLATE_RE);
      expect(plate.plate).not.toMatch(/\d{11}/);
      const tail = makeTail(rng);
      rng = tail.rng;
      expect(tail.tail).toMatch(TAIL_RE);
      expect(tail.tail.length).toBe(4);
      const code = makeCode(rng);
      rng = code.rng;
      expect(code.code).toMatch(CODE_RE);
    }
    const shift = startShift("morning", "ids");
    expect("滨A·D48216").toMatch(PLATE_RE);
    for (const offer of shift.offers) {
      expect(offer.tail).toMatch(TAIL_RE);
      expect(offer.tripCode).toMatch(CODE_RE);
      expect(offer.origin.length).toBeGreaterThan(0);
      expect(offer.destination.length).toBeGreaterThan(0);
      expect(offer.estimateYuan).toBeGreaterThan(0);
      expect(["快车", "特惠", "拼车"]).toContain(offer.category);
    }
  });
});
