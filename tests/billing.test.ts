import { describe, expect, test } from "bun:test";
import { SAMPLE_RATES, rateForIndex, settle } from "../src/billing";
import { FARE_LABEL } from "../src/city";

describe("billing", () => {
  test("every bill is marked simulated and unofficial", () => {
    for (let i = 0; i < SAMPLE_RATES.length; i++) {
      const bill = settle({
        category: i % 3 === 0 ? "快车" : i % 3 === 1 ? "特惠" : "拼车",
        shift: "morning",
        distanceKm: 6 + i,
        minutes: 12 + i,
        waitMin: i % 2,
        tollYuan: i % 4 === 0 ? 8 : 0,
        surgeYuan: i % 3 === 0 ? 4 : 0,
        dispatchYuan: i === 2 ? 3 : 0,
        rewardYuan: i % 4 === 0 ? 2 : 0,
        rate: rateForIndex(i),
      });
      expect(bill.label).toBe("模拟计价、非官方");
      expect(bill.label).toBe(FARE_LABEL);
      expect(bill.official).toBe(false);
      expect(bill.passengerPay).toBeGreaterThan(0);
      expect(bill.lines.some((line) => line.name.includes("抽成") || line.name.includes("补贴"))).toBe(true);
    }
  });

  test("commission is not a flat 14 percent and can be negative", () => {
    expect(SAMPLE_RATES.every((rate) => rate !== 0.14)).toBe(true);
    expect(new Set(SAMPLE_RATES).size).toBeGreaterThan(3);
    expect(Math.min(...SAMPLE_RATES)).toBeLessThan(0);
    const rates = SAMPLE_RATES.map((_, i) => {
      return settle({
        category: "快车",
        shift: "peak",
        distanceKm: 10,
        minutes: 20,
        waitMin: 0,
        tollYuan: 0,
        surgeYuan: 0,
        dispatchYuan: 0,
        rewardYuan: 0,
        rate: rateForIndex(i),
      }).commissionRate;
    });
    expect(rates.every((rate) => Math.abs(rate - 0.14) > 0.001)).toBe(true);
    expect(rates.some((rate) => rate < 0)).toBe(true);
  });

  test("surge is not treated as the platform cut", () => {
    const plain = settle({
      category: "快车",
      shift: "night",
      distanceKm: 8,
      minutes: 16,
      waitMin: 0,
      tollYuan: 0,
      surgeYuan: 0,
      dispatchYuan: 0,
      rewardYuan: 0,
      rate: 0.1,
    });
    const surged = settle({ ...{
      category: "快车" as const,
      shift: "night" as const,
      distanceKm: 8,
      minutes: 16,
      waitMin: 0,
      tollYuan: 0,
      surgeYuan: 6,
      dispatchYuan: 0,
      rewardYuan: 0,
      rate: 0.1,
    } });
    expect(surged.driverIncome - plain.driverIncome).toBeCloseTo(6, 1);
    expect(surged.passengerPay - plain.passengerPay).toBeCloseTo(6, 1);
  });
});
