import type { ShiftId } from "./types";
import { rngInt } from "./rng";

export const DRIVER = {
  name: "林晚舟",
  level: "Lv.3",
  rank: "熟练",
  plate: "滨A·D48216",
  vehicle: "新能源快车",
} as const;

export const SHIFTS: Record<
  ShiftId,
  { id: ShiftId; name: string; start: number; end: number; blurb: string; speed: number; weather: string }
> = {
  morning: {
    id: "morning",
    name: "早班",
    start: 6 * 60,
    end: 14 * 60,
    blurb: "天亮出车。机场和高铁的人会多一些，路还算顺。",
    speed: 30,
    weather: "晴",
  },
  peak: {
    id: "peak",
    name: "晚高峰",
    start: 17 * 60,
    end: 21 * 60 + 30,
    blurb: "下班和商圈叠在一起，车流慢，单却密。",
    speed: 22,
    weather: "阴",
  },
  night: {
    id: "night",
    name: "夜班",
    start: 21 * 60,
    end: 29 * 60,
    blurb: "夜港散场和医院夜诊。车少，更要把人稳稳送到。",
    speed: 36,
    weather: "夜间",
  },
};

export const PLACES = [
  "滨江机场 T2",
  "滨江高铁站",
  "市一医院",
  "江湾商圈",
  "夜港散场点",
  "江心充电站",
  "大学城北门",
  "江畔公园",
  "会展中心",
  "老城菜市场",
  "滨江大桥南",
  "云杉小区",
] as const;

export const PLATE_RE = /^滨A·[A-Z]\d{5}$/;
export const TAIL_RE = /^\d{4}$/;
export const CODE_RE = /^BJ\d{4}$/;

export function makePlate(rng: number): { rng: number; plate: string } {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const letter = rngInt(rng, letters.length);
  let state = letter.state;
  let digits = "";
  for (let i = 0; i < 5; i++) {
    const d = rngInt(state, 10);
    state = d.state;
    digits += String(d.n);
  }
  return { rng: state, plate: `滨A·${letters[letter.n]}${digits}` };
}

export function makeTail(rng: number): { rng: number; tail: string } {
  let state = rng;
  let tail = "";
  for (let i = 0; i < 4; i++) {
    const d = rngInt(state, 10);
    state = d.state;
    tail += String(d.n);
  }
  return { rng: state, tail };
}

export function makeCode(rng: number): { rng: number; code: string } {
  const tail = makeTail(rng);
  return { rng: tail.rng, code: `BJ${tail.tail}` };
}

export function gradeOf(score: number): string {
  if (score >= 90) return "优秀";
  if (score >= 75) return "良好";
  if (score >= 60) return "一般";
  return "较低";
}

export const DISCLAIMER =
  "非官方同人作品，与任何出行平台及其关联公司无关。规则与价格均为模拟。";

export const FARE_LABEL = "模拟计价、非官方" as const;
