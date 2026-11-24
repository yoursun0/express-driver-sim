export const EVENT_IDS = [
  "drunk",
  "child",
  "cant-find",
  "paid-wait",
  "pax-cancel",
  "restriction",
  "toll",
  "battery",
  "rest",
  "hospital",
  "complaint",
  "platform",
] as const;

export type EventId = (typeof EVENT_IDS)[number];

export type Category = "快车" | "特惠" | "拼车";

export type ShiftId = "morning" | "peak" | "night";

export type Phase =
  | "title"
  | "depart-check"
  | "listening"
  | "pickup"
  | "waiting"
  | "boarding"
  | "trip"
  | "bill"
  | "rating"
  | "rest"
  | "charging"
  | "summary";

export type ComplaintKind = "odor" | "ac" | "attitude";

export type PlatformVariant = "verify" | "safety" | "dispatch-reason" | "health";

export type RestTier = "4h" | "10h";

export interface Chip {
  text: string;
  tone: "good" | "bad" | "neutral";
}

export interface Choice {
  id: string;
  label: string;
  chips: Chip[];
  safe: boolean;
}

export type SystemModal = "offer" | "bill" | "rating" | "cancel-ask" | "end-ask" | "boarding";

export interface Modal {
  eventId: EventId | SystemModal;
  variant: string | null;
  title: string;
  body: string;
  choices: Choice[];
  blocksTime: boolean;
}

export interface OfferFlags {
  drunk: boolean;
  child: boolean;
  cantFind: boolean;
  paxCancel: boolean;
  restriction: boolean;
  toll: boolean;
  hospital: boolean;
  complaint: ComplaintKind | null;
}

export interface OfferEvent {
  id: EventId;
  phase: "pickup" | "waiting" | "boarding" | "trip";
  when: "enter" | "progress";
  progress: number;
  variant: string | null;
  fired: boolean;
}

export interface Offer {
  id: string;
  category: Category;
  origin: string;
  destination: string;
  via: string | null;
  distanceKm: number;
  pickupKm: number;
  estimateYuan: number;
  surgeYuan: number;
  dispatchYuan: number;
  rewardYuan: number;
  rate: number;
  reason: string;
  pooled: boolean;
  tail: string;
  tripCode: string;
  flags: OfferFlags;
  events: OfferEvent[];
}

export interface BillLine {
  name: string;
  yuan: number;
}

export interface Bill {
  label: "模拟计价、非官方";
  official: false;
  category: Category;
  fixedPrice: boolean;
  passengerPay: number;
  driverIncome: number;
  commissionYuan: number;
  commissionRate: number;
  surgeYuan: number;
  dispatchYuan: number;
  rewardYuan: number;
  tollYuan: number;
  waitYuan: number;
  coreYuan: number;
  lines: BillLine[];
}

export type TripResult = "完成" | "无责取消" | "有责取消" | "乘客取消";

export interface TripRecord {
  id: string;
  clock: string;
  category: Category;
  origin: string;
  destination: string;
  via: string | null;
  km: number;
  driverYuan: number;
  commissionRate: number;
  result: TripResult;
  note: string;
}

export interface InboxItem {
  id: EventId;
  variant: string | null;
  after: number;
  fired: boolean;
}

export interface Stats {
  completed: number;
  noFault: number;
  atFault: number;
  paxCancel: number;
  complaints: number;
  charges: number;
  rests: number;
  declines: number;
  tips: number;
}

export interface State {
  version: 1;
  seed: string;
  rng: number;
  shift: ShiftId | null;
  phase: Phase;
  clockMin: number;
  shiftStart: number;
  shiftEnd: number;
  speedMult: 1 | 2;
  paused: boolean;
  sound: boolean;
  battery: number;
  service: number;
  serviceStart: number;
  income: number;
  /** 累计服务时长（听单不算）。模拟规则。 */
  serviceMin: number;
  /** 连续休息分钟，满 20 清零服务时长。 */
  restStreakMin: number;
  /** 累计计费时长，只在行程中增加。 */
  billableMin: number;
  restQueued: RestTier | null;
  restTier: RestTier | null;
  restUntil: number | null;
  didLongRest: boolean;
  batteryRisk: boolean;
  batteryOffered: boolean;
  chargeTarget: number;
  offers: Offer[];
  offer: Offer | null;
  modal: Modal | null;
  progressKm: number;
  legKm: number;
  speedKmh: number;
  traffic: string;
  weather: string;
  freeWaitLeft: number;
  paidWaitMin: number;
  waitConsent: boolean;
  paidWaitOffered: boolean;
  contacts: number;
  paxEta: number | null;
  recording: boolean;
  illegalMeter: boolean;
  bill: Bill | null;
  stars: number;
  tipYuan: number;
  tripQuality: number;
  tripMin: number;
  meterMin: number;
  tollYuan: number;
  log: TripRecord[];
  stats: Stats;
  seenEvents: EventId[];
  inbox: InboxItem[];
  endAfterTrip: boolean;
  toast: string | null;
  odometerKm: number;
  cruiseMin: number;
  nextCruise: number;
  orderSeq: number;
}

export interface ActionMap {
  start: { type: "start"; shift: ShiftId; seed?: string };
  choose: { type: "choose"; id: string };
  tick: { type: "tick"; minutes: number };
  speed: { type: "speed" };
  sound: { type: "sound" };
  pause: { type: "pause" };
  "end-shift": { type: "end-shift" };
  "cancel-order": { type: "cancel-order" };
  "new-shift": { type: "new-shift" };
}

export type Action = ActionMap[keyof ActionMap];
