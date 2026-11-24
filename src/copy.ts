import { DISCLAIMER, DRIVER, FARE_LABEL } from "./city";

export const TITLE = "《网约车司机模拟器》";

export const TAGLINE = "在虚构的滨江市出一班车。车自己往前开，你负责听单、判断和把人送到。";

export const START_CTA = "出车开工";

export const CONTINUE_CTA = "继续未完成的班次";

export const REVIEW_CTA = "查看上一班收据";

export const FOOTER = DISCLAIMER;

export const FARE_NOTE = FARE_LABEL;

export const SCORE_NOTE = "模拟，非官方算法";

export const DRIVER_CARD = {
  name: DRIVER.name,
  level: DRIVER.level,
  rank: DRIVER.rank,
  plate: DRIVER.plate,
  vehicle: DRIVER.vehicle,
};

export const PHASE_LABEL: Record<string, string> = {
  title: "未出车",
  "depart-check": "出车核验",
  listening: "听单中",
  pickup: "接驾中",
  waiting: "等待中",
  boarding: "核验中",
  trip: "行程中",
  bill: "结算中",
  rating: "评价中",
  rest: "强制休息",
  charging: "充电",
  summary: "已交班",
};

export const CHROME = [
  TITLE,
  TAGLINE,
  START_CTA,
  CONTINUE_CTA,
  FOOTER,
  FARE_NOTE,
  SCORE_NOTE,
  "本班收入",
  "听单中",
  "接驾中",
  "等待中",
  "行程中",
  "强制休息",
  "充电",
  "行程录音中",
  "早班",
  "晚高峰",
  "夜班",
  "新能源快车",
  "快车",
  "特惠",
  "拼车",
  "服务分",
  "口碑",
  "电量",
  "暂停",
  "音效",
  "交班",
  "模拟规则",
  "乘客实付",
  "司机收入",
  "平台抽成",
  "平台",
];
