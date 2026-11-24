import { FARE_LABEL, SHIFTS } from "./city";
import { yuan } from "./format";
import type { Bill, Category, ShiftId } from "./types";

/** 各单抽成样本。故意避开 0.14，并包含负值。滨江市模拟，不是公示费率。 */
export const SAMPLE_RATES = [0.11, -0.04, 0.21, 0.07, 0.18, 0.03, 0.25, -0.02, 0.09, 0.15];

export const SIM_WAIT_PER_MIN = 0.5;

export function rateForIndex(index: number): number {
  const i = ((index % SAMPLE_RATES.length) + SAMPLE_RATES.length) % SAMPLE_RATES.length;
  return SAMPLE_RATES[i]!;
}

export interface FareInput {
  category: Category;
  shift: ShiftId;
  distanceKm: number;
  minutes: number;
  waitMin: number;
  tollYuan: number;
  surgeYuan: number;
  dispatchYuan: number;
  rewardYuan: number;
  rate: number;
}

/**
 * 滨江市虚构计价结构：起步、里程、时长或低速、远途、分时、加价、调度、一口价、附加费。
 * 数字只属于这部游戏，调用方必须带「模拟计价、非官方」。
 */
export function settle(input: FareInput): Bill {
  const slot = input.shift === "peak" ? 1.18 : input.shift === "night" ? 1.1 : 1;
  const base = yuan(8.5 * (input.shift === "peak" ? 1.05 : 1));
  const perKm = 1.65 * slot;
  const includedKm = 2;
  const distFee = yuan(Math.max(0, input.distanceKm - includedKm) * perKm);
  const timeFee = yuan(input.minutes * 0.24 * slot);
  const longFee = yuan(input.distanceKm > 12 ? (input.distanceKm - 12) * 0.7 : 0);
  const metered = yuan(base + distFee + timeFee + longFee);
  const fixed = input.category !== "快车";
  const fixedCore =
    input.category === "特惠" ? yuan(metered * 0.83) : input.category === "拼车" ? yuan(metered * 0.76) : metered;
  const waitYuan = yuan(Math.max(0, input.waitMin) * SIM_WAIT_PER_MIN);
  const core = yuan(fixedCore + waitYuan);
  const commissionYuan = yuan(core * input.rate);
  const tollYuan = yuan(Math.max(0, input.tollYuan));
  const surgeYuan = yuan(Math.max(0, input.surgeYuan));
  const dispatchYuan = yuan(Math.max(0, input.dispatchYuan));
  const rewardYuan = yuan(Math.max(0, input.rewardYuan));
  const passengerPay = yuan(core + surgeYuan + dispatchYuan + tollYuan);
  const driverIncome = yuan(core - commissionYuan + surgeYuan + dispatchYuan + rewardYuan);
  const lines: Bill["lines"] = [];
  if (fixed) {
    lines.push({ name: input.category === "特惠" ? "一口价" : "拼成一口价", yuan: fixedCore });
  } else {
    lines.push({ name: "起步", yuan: base });
    lines.push({ name: "里程", yuan: distFee });
    lines.push({ name: "时长或低速", yuan: timeFee });
    if (longFee > 0) lines.push({ name: "远途", yuan: longFee });
  }
  if (waitYuan > 0) lines.push({ name: "计费等待", yuan: waitYuan });
  if (surgeYuan > 0) lines.push({ name: "临时加价（归司机）", yuan: surgeYuan });
  if (dispatchYuan > 0) lines.push({ name: "调度费（归司机）", yuan: dispatchYuan });
  if (tollYuan > 0) lines.push({ name: "附加费·收费路", yuan: tollYuan });
  if (rewardYuan > 0) lines.push({ name: "完单奖励", yuan: rewardYuan });
  lines.push({ name: commissionYuan < 0 ? "平台补贴" : "平台抽成", yuan: commissionYuan });
  return {
    label: FARE_LABEL,
    official: false,
    category: input.category,
    fixedPrice: fixed,
    passengerPay,
    driverIncome,
    commissionYuan,
    commissionRate: input.rate,
    surgeYuan,
    dispatchYuan,
    rewardYuan,
    tollYuan,
    waitYuan,
    coreYuan: core,
    lines,
  };
}

export function estimateTrip(input: Omit<FareInput, "waitMin" | "tollYuan">): Bill {
  return settle({ ...input, waitMin: 0, tollYuan: 0 });
}

export function minutesForKm(km: number, shift: ShiftId): number {
  return (km / SHIFTS[shift].speed) * 60;
}
