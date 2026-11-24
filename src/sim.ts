import { estimateTrip, minutesForKm, rateForIndex, settle, SIM_WAIT_PER_MIN } from "./billing";
import { DISCLAIMER, DRIVER, gradeOf, makeCode, makeTail, PLACES, SHIFTS } from "./city";
import { buildEventModal, effectsFor, type Effect } from "./events";
import { formatClock, formatYuan, yuan } from "./format";
import { hashSeed, nextRng, rngInt } from "./rng";
import type {
  Action,
  Category,
  EventId,
  Modal,
  Offer,
  OfferEvent,
  OfferFlags,
  Phase,
  ShiftId,
  State,
  Stats,
  TripResult,
} from "./types";
import { EVENT_IDS } from "./types";

const emptyFlags = (): OfferFlags => ({
  drunk: false,
  child: false,
  cantFind: false,
  paxCancel: false,
  restriction: false,
  toll: false,
  hospital: false,
  complaint: null,
});

function emptyStats(): Stats {
  return {
    completed: 0,
    noFault: 0,
    atFault: 0,
    paxCancel: 0,
    complaints: 0,
    charges: 0,
    rests: 0,
    declines: 0,
    tips: 0,
  };
}

export function titleState(): State {
  return {
    version: 1,
    seed: "",
    rng: 1,
    shift: null,
    phase: "title",
    clockMin: 6 * 60,
    shiftStart: 6 * 60,
    shiftEnd: 14 * 60,
    speedMult: 1,
    paused: false,
    sound: true,
    battery: 86,
    service: 82,
    serviceStart: 82,
    income: 0,
    serviceMin: 0,
    restStreakMin: 0,
    billableMin: 0,
    restQueued: null,
    restTier: null,
    restUntil: null,
    didLongRest: false,
    batteryRisk: false,
    batteryOffered: false,
    chargeTarget: 80,
    offers: [],
    offer: null,
    modal: null,
    progressKm: 0,
    legKm: 0,
    speedKmh: 0,
    traffic: "路顺",
    weather: "晴",
    freeWaitLeft: 0,
    paidWaitMin: 0,
    waitConsent: false,
    paidWaitOffered: false,
    contacts: 0,
    paxEta: null,
    recording: false,
    illegalMeter: false,
    bill: null,
    stars: 0,
    tipYuan: 0,
    tripQuality: 1,
    tripMin: 0,
    meterMin: 0,
    tollYuan: 0,
    log: [],
    stats: emptyStats(),
    seenEvents: [],
    inbox: [],
    endAfterTrip: false,
    toast: null,
    odometerKm: 0,
    cruiseMin: 0,
    nextCruise: 3.2,
    orderSeq: 0,
  };
}

class Roller {
  rng: number;
  constructor(seed: string) {
    this.rng = hashSeed(seed) || 1;
  }
  next(): number {
    const r = nextRng(this.rng);
    this.rng = r.state;
    return r.n;
  }
  int(span: number): number {
    const r = rngInt(this.rng, span);
    this.rng = r.state;
    return r.n;
  }
  pick<T>(items: readonly T[]): T {
    return items[this.int(items.length)]!;
  }
}

function ev(id: EventId, phase: OfferEvent["phase"], when: OfferEvent["when"], progress = 0, variant: string | null = null): OfferEvent {
  return { id, phase, when, progress, variant, fired: false };
}

function blankOffer(partial: Partial<Offer> & Pick<Offer, "id" | "category" | "origin" | "destination">): Offer {
  return {
    via: null,
    distanceKm: 12,
    pickupKm: 2.4,
    estimateYuan: 0,
    surgeYuan: 0,
    dispatchYuan: 0,
    rewardYuan: 0,
    rate: 0.09,
    reason: "就近",
    pooled: false,
    tail: "0000",
    tripCode: "BJ0000",
    flags: emptyFlags(),
    events: [],
    ...partial,
  };
}

function priceOffer(offer: Offer, shift: ShiftId): void {
  const minutes = minutesForKm(offer.distanceKm, shift);
  const bill = estimateTrip({
    category: offer.category,
    shift,
    distanceKm: offer.distanceKm,
    minutes,
    surgeYuan: offer.surgeYuan,
    dispatchYuan: offer.dispatchYuan,
    rewardYuan: offer.rewardYuan,
    rate: offer.rate,
  });
  offer.estimateYuan = bill.driverIncome;
}

export function startShift(shift: ShiftId, seed = "滨江"): State {
  const meta = SHIFTS[shift];
  const roll = new Roller(`${seed}:${shift}`);
  const state = titleState();
  state.seed = seed;
  state.shift = shift;
  state.phase = "depart-check";
  state.clockMin = meta.start;
  state.shiftStart = meta.start;
  state.shiftEnd = meta.end;
  state.weather = meta.weather;
  state.battery = 84 + roll.int(8);
  state.service = 80 + roll.int(6);
  state.serviceStart = state.service;
  state.offers = buildOffers(roll, shift);
  state.inbox = [
    { id: "platform", variant: "dispatch-reason", after: 0, fired: false },
    { id: "platform", variant: "safety", after: 1, fired: false },
    { id: "battery", variant: null, after: 2, fired: false },
    { id: "platform", variant: "health", after: 3, fired: false },
  ];
  state.rng = roll.rng;
  state.modal = buildEventModal(state, "platform", "verify");
  remember(state, "platform");
  state.toast = DISCLAIMER;
  return state;
}

function buildOffers(roll: Roller, shift: ShiftId): Offer[] {
  const count = shift === "peak" ? 6 : 10;
  const offers: Offer[] = [];
  for (let i = 0; i < count; i++) {
    const origin = PLACES[i % PLACES.length]!;
    let destination = PLACES[(i + 5) % PLACES.length]!;
    if (destination === origin) destination = PLACES[(i + 6) % PLACES.length]!;
    const tail = makeTail(roll.rng);
    roll.rng = tail.rng;
    const code = makeCode(roll.rng);
    roll.rng = code.rng;
    const offer = blankOffer({
      id: `ord-${i + 1}`,
      category: "快车",
      origin,
      destination,
      distanceKm: yuan(11.5 + roll.next() * 4),
      pickupKm: yuan(1.8 + roll.next() * 1.4),
      surgeYuan: i % 5 === 0 ? 5 : 0,
      dispatchYuan: 0,
      rewardYuan: i % 4 === 0 ? 2 : 0,
      rate: rateForIndex(i),
      reason: roll.pick(["就近", "顺路", "口碑较好", "电量还够", "回程顺路"]),
      tail: tail.tail,
      tripCode: code.code,
    });
    offers.push(offer);
  }

  const script: Array<(offer: Offer) => void> = [
    (o) => {
      o.category = "快车";
      o.origin = "云杉小区";
      o.destination = "江湾商圈";
      o.distanceKm = 13.6;
      o.pickupKm = 2.6;
      o.reason = "就近";
      o.surgeYuan = shift === "peak" ? 6 : 0;
      o.flags.restriction = true;
      o.flags.toll = true;
      o.events = [ev("restriction", "pickup", "progress", 0.34), ev("toll", "trip", "progress", 0.3)];
    },
    (o) => {
      o.category = "特惠";
      o.origin = "老城菜市场";
      o.destination = "会展中心";
      o.distanceKm = 12.2;
      o.pickupKm = 2.2;
      o.reason = "顺路";
      o.surgeYuan = 0;
      o.flags.cantFind = true;
      o.events = [ev("cant-find", "waiting", "enter")];
    },
    (o) => {
      o.category = "快车";
      o.origin = "大学城北门";
      o.destination = "市一医院";
      o.distanceKm = 11.4;
      o.pickupKm = 2.5;
      o.reason = "就医单，请安静驾驶";
      o.dispatchYuan = 4;
      o.surgeYuan = 0;
      o.flags.hospital = true;
      o.events = [ev("hospital", "trip", "progress", 0.45)];
    },
    (o) => {
      o.category = "拼车";
      o.pooled = true;
      o.origin = "滨江高铁站";
      o.via = "江畔公园";
      o.destination = "夜港散场点";
      o.distanceKm = 14.2;
      o.pickupKm = 3.1;
      o.reason = "已拼好的一程";
      o.surgeYuan = 0;
      o.flags.child = true;
      o.events = [ev("child", "boarding", "enter")];
    },
    (o) => {
      o.category = "快车";
      o.origin = "江湾商圈";
      o.destination = "滨江机场 T2";
      o.distanceKm = 16.4;
      o.pickupKm = 2.8;
      o.reason = "场站方向";
      o.surgeYuan = 6;
      o.flags.paxCancel = true;
      o.events = [ev("pax-cancel", "waiting", "enter")];
    },
    (o) => {
      o.category = "快车";
      o.origin = "夜港散场点";
      o.destination = "云杉小区";
      o.distanceKm = 12.8;
      o.pickupKm = 2.4;
      o.reason = "口碑较好";
      o.flags.drunk = true;
      o.flags.complaint = "odor";
      o.events = [ev("drunk", "boarding", "enter"), ev("complaint", "trip", "progress", 0.4, "odor")];
    },
  ];

  script.forEach((apply, index) => {
    const offer = offers[index];
    if (offer) apply(offer);
  });
  if (count > 7) {
    const extra = offers[7]!;
    extra.category = "特惠";
    extra.reason = "一口价顺路";
    extra.surgeYuan = 0;
  }
  for (const offer of offers) priceOffer(offer, shift);
  return offers;
}

export function plannedEventIds(state: State): EventId[] {
  const ids = new Set<EventId>(["platform", "rest", "battery", "paid-wait"]);
  for (const offer of state.offers) {
    for (const item of offer.events) ids.add(item.id);
  }
  for (const item of state.inbox) ids.add(item.id);
  if (state.offer) for (const item of state.offer.events) ids.add(item.id);
  return EVENT_IDS.filter((id) => ids.has(id));
}

export function plannedServiceMinutes(state: State): number {
  if (!state.shift) return 0;
  const speed = SHIFTS[state.shift].speed;
  let minutes = 0;
  const offers = state.offer ? [state.offer, ...state.offers] : state.offers;
  for (const offer of offers) {
    const moveMin = ((offer.pickupKm + (offer.flags.paxCancel ? 0 : offer.distanceKm)) / speed) * 60;
    minutes += moveMin + (offer.flags.paxCancel ? 2 : 4);
  }
  return minutes;
}

export function dispatch(prev: State, action: Action): State {
  const state = structuredClone(prev);
  if (action.type === "start") return startShift(action.shift, action.seed ?? `bj-${hashSeed(String(Date.now()))}`);
  if (action.type === "new-shift") return titleState();
  if (action.type === "speed") {
    state.speedMult = state.speedMult === 1 ? 2 : 1;
    return state;
  }
  if (action.type === "sound") {
    state.sound = !state.sound;
    return state;
  }
  if (action.type === "pause") {
    state.paused = !state.paused;
    return state;
  }
  if (action.type === "tick") {
    if (state.paused || state.phase === "title" || state.phase === "summary") return state;
    advance(state, Math.max(0, action.minutes));
    return state;
  }
  if (action.type === "cancel-order") {
    openCancelAsk(state);
    return state;
  }
  if (action.type === "end-shift") {
    openEndAsk(state);
    return state;
  }
  if (action.type === "choose") {
    applyChoice(state, action.id);
    return state;
  }
  return state;
}

export function forceEvent(prev: State, id: EventId, variant?: string | null): State {
  const state = structuredClone(prev);
  if (!state.offer && state.offers[0]) state.offer = structuredClone(state.offers[0]);
  if (state.phase === "title" || state.phase === "depart-check" || state.phase === "summary") {
    state.phase = "waiting";
    state.freeWaitLeft = 3;
  }
  if (id === "paid-wait") state.freeWaitLeft = 0;
  openEvent(state, id, variant ?? (id === "complaint" ? "odor" : id === "platform" ? "safety" : id === "rest" ? "4h" : null));
  return state;
}

function remember(state: State, id: EventId): void {
  if (!state.seenEvents.includes(id)) state.seenEvents.push(id);
}

function openEvent(state: State, id: EventId, variant: string | null): void {
  state.modal = buildEventModal(state, id, variant);
  remember(state, id);
  if (id === "battery") state.batteryOffered = true;
}

function clampService(state: State): void {
  state.service = Math.max(0, Math.min(100, state.service));
}

function resolvedCount(state: State): number {
  const s = state.stats;
  return s.completed + s.noFault + s.atFault + s.paxCancel;
}

function shiftSpeed(state: State): number {
  if (!state.shift) return 0;
  return SHIFTS[state.shift].speed;
}

function setTraffic(state: State, speed: number): void {
  state.speedKmh = Math.round(speed);
  state.traffic = speed < 18 ? "缓行" : speed < 28 ? "车多" : "路顺";
}

function markFatigue(state: State): void {
  if (state.phase === "rest" || state.phase === "summary") return;
  if (!state.didLongRest && state.billableMin >= 600) {
    state.restQueued = "10h";
    return;
  }
  if (state.serviceMin >= 240 && state.restQueued == null && state.restTier == null) {
    state.restQueued = "4h";
  }
}

function blocked(state: State): boolean {
  return Boolean(state.modal?.blocksTime) || state.paused || state.phase === "bill" || state.phase === "rating" || state.phase === "depart-check" || state.phase === "summary" || state.phase === "title";
}

function advance(state: State, minutes: number): void {
  let left = minutes;
  let guard = 0;
  while (left > 1e-6 && guard++ < 40) {
    if (blocked(state)) break;
    const sig = signature(state);
    const used = micro(state, left);
    if (state.modal?.blocksTime) break;
    if (used <= 1e-8) {
      if (signature(state) === sig) break;
      continue;
    }
    left -= used;
  }
}

function signature(state: State): string {
  return `${state.phase}|${state.modal?.title ?? ""}|${state.clockMin.toFixed(3)}|${state.progressKm.toFixed(3)}|${state.battery.toFixed(2)}`;
}

function micro(state: State, left: number): number {
  if (state.battery <= 0 && state.phase !== "charging" && state.phase !== "summary") {
    stall(state);
    return 0;
  }
  switch (state.phase) {
    case "listening":
      return listenMicro(state, left);
    case "pickup":
    case "trip":
      return driveMicro(state, left);
    case "waiting":
      return waitMicro(state, left);
    case "boarding":
      return 0;
    case "rest":
      return restMicro(state, left);
    case "charging":
      return chargeMicro(state, left);
    default:
      return 0;
  }
}

function listenMicro(state: State, left: number): number {
  if (openRestIfQueued(state)) return 0;
  if (openInbox(state)) return 0;
  if (state.clockMin >= state.shiftEnd || state.endAfterTrip) {
    toSummary(state);
    return 0;
  }
  const speed = shiftSpeed(state);
  let dt = left;
  const offerWaiting = state.offers.length > 0 && !state.endAfterTrip;
  if (offerWaiting) dt = Math.min(dt, Math.max(0, state.nextCruise - state.cruiseMin));
  const untilEnd = state.shiftEnd - state.clockMin;
  dt = Math.min(dt, Math.max(0, untilEnd));
  restAsIdle(state, dt, speed * 0.35);
  state.cruiseMin += dt;
  state.battery = Math.max(0, state.battery - dt * 0.03);
  if (state.clockMin >= state.shiftEnd - 1e-6) {
    toSummary(state);
    return dt;
  }
  if (offerWaiting && state.cruiseMin >= state.nextCruise - 1e-6) {
    presentOffer(state);
    return dt;
  }
  return dt;
}

function restAsIdle(state: State, dt: number, crawl: number): void {
  state.clockMin += dt;
  state.restStreakMin += dt;
  if (state.restStreakMin >= 20) state.serviceMin = 0;
  state.odometerKm += (crawl * dt) / 60;
  setTraffic(state, crawl);
}

function driveMicro(state: State, left: number): number {
  const phase = state.phase === "trip" ? "trip" : "pickup";
  const speed = Math.max(12, shiftSpeed(state) + (state.batteryRisk ? 3 : 0));
  const eventAt = nextEventKm(state, phase);
  const goal = eventAt == null ? state.legKm : Math.min(state.legKm, eventAt);
  const remain = Math.max(0, goal - state.progressKm);
  const dt = Math.min(left, speed <= 0 ? left : (remain / speed) * 60);
  const km = (speed * dt) / 60;
  state.clockMin += dt;
  state.progressKm += km;
  state.odometerKm += km;
  state.tripMin += dt;
  state.serviceMin += dt;
  state.restStreakMin = 0;
  if (phase === "trip") {
    state.meterMin += dt;
    state.billableMin += dt;
  }
  state.battery = Math.max(0, state.battery - km * (state.batteryRisk ? 1.25 : 0.52));
  setTraffic(state, speed);
  markFatigue(state);
  if (state.progressKm >= state.legKm - 1e-4) {
    if (phase === "pickup") arrivePickup(state);
    else arriveDest(state);
    return dt;
  }
  if (eventAt != null && state.progressKm >= eventAt - 1e-3) {
    const found = state.offer?.events.find((item) => !item.fired && item.phase === phase && item.when === "progress");
    if (found) {
      found.fired = true;
      openEvent(state, found.id, found.variant);
    }
  }
  return dt;
}

function nextEventKm(state: State, phase: "pickup" | "trip"): number | null {
  const pending = state.offer?.events.filter((item) => !item.fired && item.phase === phase && item.when === "progress") ?? [];
  if (!pending.length || state.legKm <= 0) return null;
  const marks = pending.map((item) => item.progress * state.legKm).filter((km) => km >= state.progressKm - 1e-4);
  if (!marks.length) return null;
  return Math.min(...marks);
}

function waitMicro(state: State, left: number): number {
  let dt = left;
  if (state.paxEta != null) dt = Math.min(dt, Math.max(0, state.paxEta));
  if (!state.waitConsent && !state.paidWaitOffered) dt = Math.min(dt, Math.max(0, state.freeWaitLeft));
  state.clockMin += dt;
  state.serviceMin += dt;
  state.restStreakMin = 0;
  state.tripMin += dt;
  setTraffic(state, 0);
  markFatigue(state);
  if (state.paxEta != null) state.paxEta -= dt;
  if (state.waitConsent) state.paidWaitMin += dt;
  else state.freeWaitLeft -= dt;
  if (state.paxEta != null && state.paxEta <= 1e-4) {
    goBoarding(state);
    return dt;
  }
  if (!state.waitConsent && !state.paidWaitOffered && state.freeWaitLeft <= 1e-4 && state.phase === "waiting") {
    state.paidWaitOffered = true;
    openEvent(state, "paid-wait", null);
  }
  return dt;
}

function restMicro(state: State, left: number): number {
  const remain = Math.max(0, (state.restUntil ?? state.clockMin) - state.clockMin);
  const dt = Math.min(left, remain);
  state.clockMin += dt;
  state.restStreakMin += dt;
  setTraffic(state, 0);
  if (state.clockMin >= (state.restUntil ?? state.clockMin) - 1e-6) {
    if (state.restTier === "10h") {
      state.billableMin = 0;
      state.didLongRest = true;
    }
    state.serviceMin = 0;
    state.restStreakMin = 0;
    state.restTier = null;
    state.restUntil = null;
    state.restQueued = null;
    state.toast = "休息结束，可以继续听单。";
    if (state.clockMin >= state.shiftEnd) toSummary(state);
    else enterListening(state);
  }
  return dt > 0 ? dt : 0;
}

function chargeMicro(state: State, left: number): number {
  const rate = 7;
  const need = Math.max(0, state.chargeTarget - state.battery);
  const dt = Math.min(left, need <= 0 ? 0 : need / rate);
  state.clockMin += dt;
  state.restStreakMin += dt;
  if (state.restStreakMin >= 20) state.serviceMin = 0;
  state.battery = Math.min(100, state.battery + dt * rate);
  setTraffic(state, 0);
  if (state.battery >= state.chargeTarget - 0.05) {
    state.batteryRisk = false;
    state.toast = "电量够这一班用了，回到听单。";
    if (state.clockMin >= state.shiftEnd) toSummary(state);
    else enterListening(state);
  }
  return dt > 0 ? dt : left;
}

function arrivePickup(state: State): void {
  state.phase = "waiting";
  state.progressKm = 0;
  state.legKm = 0;
  setTraffic(state, 0);
  state.freeWaitLeft = 3;
  state.paidWaitMin = 0;
  state.waitConsent = false;
  state.paidWaitOffered = false;
  state.contacts = 0;
  const flags = state.offer?.flags;
  state.paxEta = flags?.cantFind || flags?.paxCancel ? null : 1.5;
  const enter = state.offer?.events.find((item) => !item.fired && item.phase === "waiting" && item.when === "enter");
  if (enter) {
    enter.fired = true;
    openEvent(state, enter.id, enter.variant);
  }
}

function goBoarding(state: State): void {
  state.phase = "boarding";
  state.paxEta = null;
  setTraffic(state, 0);
  const enter = state.offer?.events.find((item) => !item.fired && item.phase === "boarding" && item.when === "enter");
  if (enter) {
    enter.fired = true;
    openEvent(state, enter.id, enter.variant);
    return;
  }
  state.modal = boardingModal(state);
}

function arriveDest(state: State): void {
  const offer = state.offer;
  if (!offer || !state.shift) {
    enterListening(state);
    return;
  }
  const distance = Math.max(offer.distanceKm, state.progressKm);
  const bill = settle({
    category: offer.category,
    shift: state.shift,
    distanceKm: distance,
    minutes: Math.max(1, state.meterMin),
    waitMin: state.illegalMeter ? 0 : state.paidWaitMin,
    tollYuan: state.tollYuan,
    surgeYuan: offer.surgeYuan,
    dispatchYuan: offer.dispatchYuan,
    rewardYuan: offer.rewardYuan,
    rate: offer.rate,
  });
  state.bill = bill;
  state.phase = "bill";
  state.recording = true;
  setTraffic(state, 0);
  state.modal = {
    eventId: "bill",
    variant: null,
    title: "这一单的账单",
    body: billBody(state),
    choices: [
      {
        id: "bill-ok",
        label: "确认账单，模拟收款已完成",
        chips: [{ text: `司机 ${formatYuan(bill.driverIncome)} 元`, tone: "good" }],
        safe: true,
      },
      {
        id: "bill-look",
        label: "对过明细后再确认",
        chips: [{ text: bill.label, tone: "neutral" }],
        safe: false,
      },
    ],
    blocksTime: true,
  };
}

function billBody(state: State): string {
  const bill = state.bill;
  const offer = state.offer;
  if (!bill || !offer) return "模拟计价、非官方";
  const rateText =
    bill.commissionYuan < 0
      ? `这一单抽成为负，相当于补贴 ${formatYuan(Math.abs(bill.commissionYuan))} 元。`
      : `这一单平台抽成 ${formatYuan(bill.commissionYuan)} 元（约 ${(bill.commissionRate * 100).toFixed(1)}%）。各单比例不同。`;
  const od = offer.via ? `${offer.origin} → ${offer.via} → ${offer.destination}` : `${offer.origin} → ${offer.destination}`;
  return `${od}\n${bill.label}\n乘客实付 ${formatYuan(bill.passengerPay)} 元\n司机收入 ${formatYuan(bill.driverIncome)} 元\n${rateText}\n支付已在模拟里自动完成。`;
}

function openRating(state: State): void {
  const stars = state.tripQuality >= 3 ? 5 : state.tripQuality >= 1 ? 4 : state.tripQuality >= -1 ? 3 : 2;
  const tip = stars >= 5 && state.orderSeq % 3 === 0 ? 6 : 0;
  state.stars = stars;
  state.tipYuan = tip;
  state.phase = "rating";
  const tipLine = tip > 0 ? `乘客自愿打赏 ${formatYuan(tip)} 元，全部归司机。这是模拟，没有真实支付。` : "这一单没有打赏。";
  state.modal = {
    eventId: "rating",
    variant: null,
    title: "乘客评价",
    body: `乘客给了 ${stars} 星。服务分按模拟规则小幅变化，旁注：模拟，非官方算法。${tipLine}`,
    choices: [
      { id: "rate-ok", label: "收下评价，继续", chips: [{ text: `${stars} 星`, tone: stars >= 4 ? "good" : "neutral" }], safe: true },
      { id: "rate-note", label: "记下这一单再走", chips: [{ text: "写入行程", tone: "neutral" }], safe: false },
    ],
    blocksTime: true,
  };
}

function presentOffer(state: State): void {
  const offer = state.offers[0];
  if (!offer) return;
  const surge = offer.surgeYuan > 0 ? `临时加价 ${formatYuan(offer.surgeYuan)} 元，归司机。` : "";
  const dispatchFee = offer.dispatchYuan > 0 ? `调度费 ${formatYuan(offer.dispatchYuan)} 元，归司机。` : "";
  const via = offer.via ? `先到 ${offer.via}，再到 ${offer.destination}。` : "";
  const kind = offer.category === "特惠" ? "特惠一口价。" : offer.pooled ? "这是已经拼好的一程，不会在路上再拼人。" : "快车。";
  state.modal = {
    eventId: "offer",
    variant: null,
    title: "平台播单",
    body: `${kind}${via}\n${offer.origin} → ${offer.destination}\n约 ${offer.distanceKm.toFixed(1)} 公里，模拟预估收入 ${formatYuan(offer.estimateYuan)} 元。\n${surge}${dispatchFee}\n接单原因：${offer.reason}。乘客尾号 ${offer.tail}，行程码 ${offer.tripCode}。\n模拟计价、非官方。时钟已暂停，看清楚再选。`,
    choices: [
      {
        id: "accept",
        label: "接受播单",
        chips: [
          { text: offer.category, tone: "neutral" },
          { text: `约 ${formatYuan(offer.estimateYuan)} 元`, tone: "good" },
        ],
        safe: true,
      },
      {
        id: "decline",
        label: state.stats.declines >= 2 ? "婉拒（口碑会承压）" : "婉拒这一单",
        chips: [{ text: state.stats.declines >= 2 ? "服务分 -2" : "前两次不扣分", tone: state.stats.declines >= 2 ? "bad" : "neutral" }],
        safe: false,
      },
    ],
    blocksTime: true,
  };
}

function boardingModal(state: State): Modal {
  const offer = state.offer;
  return {
    eventId: "boarding",
    variant: null,
    title: "上车核验",
    body: `车牌 ${DRIVER.plate}。乘客尾号 ${offer?.tail ?? "----"}，行程码 ${offer?.tripCode ?? "----"}。提醒系好安全带，再开始行程。人没上车不能计费。`,
    choices: [
      { id: "board-ok", label: "核对一致，提醒安全带，开始行程", chips: [{ text: "开始行程", tone: "good" }], safe: true },
      { id: "board-skip", label: "没核对就出发", chips: [{ text: "服务分", tone: "bad" }], safe: false },
      { id: "board-early", label: "人还没坐稳就提前计费", chips: [{ text: "投诉风险", tone: "bad" }], safe: false },
    ],
    blocksTime: true,
  };
}

function openCancelAsk(state: State): void {
  if (!state.offer || !["pickup", "waiting", "boarding", "trip"].includes(state.phase)) return;
  state.modal = {
    eventId: "cancel-ask",
    variant: null,
    title: "要结束这一单吗",
    body: "没有乘客原因、封路或电量报备时，司机主动取消会记为有责，并影响模拟服务分。",
    choices: [
      { id: "cancel-back", label: "继续这一单", chips: [{ text: "返回", tone: "neutral" }], safe: true },
      { id: "cancel-fault", label: "我不跑了", chips: [{ text: "有责取消", tone: "bad" }], safe: false },
    ],
    blocksTime: true,
  };
}

function openEndAsk(state: State): void {
  const mid = ["pickup", "waiting", "boarding", "trip", "bill", "rating"].includes(state.phase);
  state.modal = {
    eventId: "end-ask",
    variant: null,
    title: "交班",
    body: mid ? "这一单还没结束。可以送完再交班，也可以现在中断。" : "本班收入和行程会写在收据上，存在这台浏览器里。",
    choices: mid
      ? [
          { id: "end-later", label: "送完这一单再交班", chips: [{ text: "稍后", tone: "neutral" }], safe: true },
          { id: "end-abort", label: "现在就结束，这一单记为有责取消", chips: [{ text: "有责取消", tone: "bad" }], safe: false },
          { id: "end-back", label: "继续开", chips: [{ text: "返回", tone: "good" }], safe: false },
        ]
      : [
          { id: "end-now", label: "现在交班", chips: [{ text: "看收据", tone: "neutral" }], safe: true },
          { id: "end-back", label: "再听一会", chips: [{ text: "返回", tone: "good" }], safe: false },
        ],
    blocksTime: true,
  };
}

function applyChoice(state: State, id: string): void {
  if (id === "accept") {
    acceptOffer(state);
    return;
  }
  if (id === "decline") {
    declineOffer(state);
    return;
  }
  if (id === "bill-ok" || id === "bill-look") {
    state.modal = null;
    openRating(state);
    return;
  }
  if (id === "rate-ok" || id === "rate-note") {
    finishRating(state);
    return;
  }
  if (id === "board-ok") {
    startTrip(state, false);
    return;
  }
  if (id === "board-skip") {
    state.service -= 2;
    state.tripQuality -= 1;
    clampService(state);
    state.toast = "没有核对尾号就走了，服务分降了一点。";
    startTrip(state, false);
    return;
  }
  if (id === "board-early") {
    state.service -= 4;
    state.tripQuality -= 3;
    state.stats.complaints += 1;
    state.illegalMeter = true;
    clampService(state);
    state.toast = "人还没上车就点了计费。这一单带着投诉风险。";
    startTrip(state, false);
    return;
  }
  if (id === "cancel-back" || id === "end-back") {
    state.modal = null;
    return;
  }
  if (id === "cancel-fault") {
    cancelCurrent(state, "有责取消", "司机主动取消");
    return;
  }
  if (id === "end-now") {
    state.modal = null;
    toSummary(state);
    return;
  }
  if (id === "end-later") {
    state.endAfterTrip = true;
    state.modal = null;
    state.toast = "这一单结束后就交班。";
    return;
  }
  if (id === "end-abort") {
    state.endAfterTrip = true;
    if (state.offer && ["pickup", "waiting", "boarding", "trip"].includes(state.phase)) {
      cancelCurrent(state, "有责取消", "交班时中断订单");
    } else {
      state.modal = null;
      toSummary(state);
    }
    return;
  }
  const effects = effectsFor(state, id);
  if (!effects.length) {
    state.modal = null;
    return;
  }
  for (const effect of effects) applyEffect(state, effect);
}

function applyEffect(state: State, effect: Effect): void {
  switch (effect.t) {
    case "service":
      state.service += effect.n ?? 0;
      clampService(state);
      break;
    case "quality":
      state.tripQuality += effect.n ?? 0;
      break;
    case "complaint":
      state.stats.complaints += 1;
      break;
    case "toast":
      state.toast = effect.text ?? null;
      break;
    case "note":
      state.toast = effect.text ?? state.toast;
      break;
    case "contacts":
      state.contacts += effect.n ?? 1;
      break;
    case "pax-eta":
      state.paxEta = effect.n ?? 2;
      break;
    case "wait-consent":
      state.waitConsent = true;
      if (state.paxEta == null) state.paxEta = 1.4;
      break;
    case "illegal-wait":
      state.illegalMeter = true;
      break;
    case "early-meter":
      state.illegalMeter = true;
      break;
    case "toll":
      state.tollYuan += effect.n ?? 0;
      break;
    case "ground":
      if (state.phase === "trip") state.legKm += effect.n ?? 0;
      break;
    case "delay":
      state.clockMin += effect.n ?? 0;
      state.serviceMin += effect.n ?? 0;
      if (state.phase === "trip") {
        state.meterMin += effect.n ?? 0;
        state.billableMin += effect.n ?? 0;
      }
      markFatigue(state);
      break;
    case "start-trip":
      startTrip(state, true);
      break;
    case "charge":
      state.modal = null;
      state.phase = "charging";
      state.recording = false;
      state.chargeTarget = Math.min(96, Math.max(78, state.battery + 28));
      state.stats.charges += 1;
      setTraffic(state, 0);
      break;
    case "rest":
      beginRest(state, effect.tier ?? "4h", effect.n ?? 20);
      break;
    case "cancel":
      cancelCurrent(state, effect.kind ?? "无责取消", effect.text ?? "已取消");
      break;
    case "battery-risk":
      state.batteryRisk = true;
      break;
    case "battery-caution":
      state.batteryRisk = false;
      break;
    case "close":
      state.modal = null;
      if (state.phase === "depart-check") enterListening(state);
      break;
    default:
      break;
  }
}

function beginRest(state: State, tier: "4h" | "10h", minutes: number): void {
  state.modal = null;
  state.phase = "rest";
  state.restTier = tier;
  state.restQueued = null;
  state.restUntil = state.clockMin + minutes;
  state.restStreakMin = 0;
  state.recording = false;
  state.stats.rests += 1;
  setTraffic(state, 0);
}

function startTrip(state: State, keepToast: boolean): void {
  const offer = state.offer;
  if (!offer) return;
  state.phase = "trip";
  state.modal = null;
  state.recording = true;
  state.progressKm = 0;
  state.legKm = offer.distanceKm;
  state.meterMin = 0;
  setTraffic(state, shiftSpeed(state));
  if (!keepToast) state.toast = state.toast ?? "行程开始。请按导航走。";
}

function acceptOffer(state: State): void {
  const offer = state.offers.shift();
  if (!offer) return;
  state.offer = offer;
  state.orderSeq += 1;
  state.phase = "pickup";
  state.modal = null;
  state.progressKm = 0;
  state.legKm = offer.pickupKm;
  state.tripMin = 0;
  state.meterMin = 0;
  state.tripQuality = 1;
  state.tollYuan = 0;
  state.illegalMeter = false;
  state.paidWaitMin = 0;
  state.recording = false;
  state.cruiseMin = 0;
  state.toast = `去接 ${offer.origin} 的乘客。`;
  setTraffic(state, shiftSpeed(state));
}

function declineOffer(state: State): void {
  const offer = state.offers.shift();
  state.modal = null;
  state.stats.declines += 1;
  if (state.stats.declines > 2) {
    state.service -= 2;
    clampService(state);
    state.toast = offer ? `婉拒了去${offer.destination}的单。频繁不接，口碑在承压。` : "已婉拒。";
  } else {
    state.toast = "这一单婉拒了，回到听单。";
  }
  state.cruiseMin = 0;
  state.nextCruise = 2.4;
  state.phase = "listening";
}

function cancelCurrent(state: State, kind: TripResult, note: string): void {
  const offer = state.offer;
  if (offer) {
    state.log.push({
      id: offer.id,
      clock: formatClock(state.clockMin),
      category: offer.category,
      origin: offer.origin,
      destination: offer.destination,
      via: offer.via,
      km: yuan(state.phase === "trip" ? state.progressKm : offer.pickupKm),
      driverYuan: 0,
      commissionRate: offer.rate,
      result: kind,
      note,
    });
  }
  if (kind === "有责取消") {
    state.stats.atFault += 1;
    state.service -= 3;
    clampService(state);
  } else if (kind === "乘客取消") state.stats.paxCancel += 1;
  else state.stats.noFault += 1;
  state.offer = null;
  state.recording = false;
  state.modal = null;
  state.toast = note;
  if (state.clockMin >= state.shiftEnd || state.endAfterTrip) toSummary(state);
  else enterListening(state);
}

function finishRating(state: State): void {
  const bill = state.bill;
  const offer = state.offer;
  const tip = state.tipYuan;
  const earned = yuan((bill?.driverIncome ?? 0) + tip);
  state.income = yuan(state.income + earned);
  if (tip > 0) state.stats.tips += 1;
  if (state.stars >= 5) state.service += 1;
  if (state.stars <= 2) state.service -= 2;
  clampService(state);
  if (offer && bill) {
    state.log.push({
      id: offer.id,
      clock: formatClock(state.clockMin),
      category: offer.category,
      origin: offer.origin,
      destination: offer.destination,
      via: offer.via,
      km: yuan(Math.max(offer.distanceKm, state.progressKm)),
      driverYuan: earned,
      commissionRate: bill.commissionRate,
      result: "完成",
      note: offer.pooled ? "已拼好的一程" : offer.category === "特惠" ? "一口价" : "完成订单",
    });
  }
  state.stats.completed += 1;
  state.offer = null;
  state.bill = null;
  state.recording = false;
  state.modal = null;
  if (state.clockMin >= state.shiftEnd || state.endAfterTrip) toSummary(state);
  else enterListening(state);
}

function enterListening(state: State): void {
  state.phase = "listening";
  state.recording = false;
  state.cruiseMin = 0;
  state.nextCruise = 3.2;
  setTraffic(state, shiftSpeed(state) * 0.35);
  if (state.endAfterTrip || state.clockMin >= state.shiftEnd) {
    toSummary(state);
    return;
  }
  if (openRestIfQueued(state)) return;
  if (openInbox(state)) return;
}

function openRestIfQueued(state: State): boolean {
  if (!state.restQueued || state.modal) return false;
  const tier = state.restQueued;
  state.modal = buildEventModal(state, "rest", tier);
  state.restQueued = null;
  remember(state, "rest");
  return true;
}

function openInbox(state: State): boolean {
  if (state.modal || state.phase !== "listening") return false;
  const done = resolvedCount(state);
  const item = state.inbox.find((entry) => !entry.fired && done >= entry.after);
  if (!item) return false;
  item.fired = true;
  openEvent(state, item.id, item.variant);
  return true;
}

function stall(state: State): void {
  state.toast = "电量耗尽，只能先去充电。未完成的订单按报备中断。";
  if (state.offer && ["pickup", "waiting", "boarding", "trip"].includes(state.phase)) {
    state.battery = 1;
    cancelCurrent(state, "无责取消", "电量耗尽，已报备中断");
    state.phase = "charging";
    state.chargeTarget = 72;
    state.stats.charges += 1;
    state.modal = null;
    return;
  }
  state.battery = 1;
  state.phase = "charging";
  state.chargeTarget = 72;
  state.stats.charges += 1;
  state.modal = null;
}

function toSummary(state: State): void {
  state.phase = "summary";
  state.modal = null;
  state.recording = false;
  state.paused = false;
  setTraffic(state, 0);
}

export function phaseLabel(phase: Phase): string {
  const map: Record<Phase, string> = {
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
  return map[phase];
}

export function liveDriverYuan(state: State): number | null {
  const offer = state.offer;
  if (!offer || !state.shift) return null;
  if (state.phase === "bill" || state.phase === "rating") return state.bill?.driverIncome ?? offer.estimateYuan;
  if (offer.category !== "快车") return offer.estimateYuan;
  if (state.phase !== "trip") return offer.estimateYuan;
  const distance = Math.max(0.4, state.progressKm);
  const bill = settle({
    category: offer.category,
    shift: state.shift,
    distanceKm: distance,
    minutes: Math.max(0, state.meterMin),
    waitMin: state.illegalMeter ? 0 : state.paidWaitMin,
    tollYuan: state.tollYuan,
    surgeYuan: offer.surgeYuan,
    dispatchYuan: offer.dispatchYuan,
    rewardYuan: 0,
    rate: offer.rate,
  });
  return bill.driverIncome;
}

export function categoryOf(offer: Offer | null): Category | null {
  return offer?.category ?? null;
}

export { gradeOf };
