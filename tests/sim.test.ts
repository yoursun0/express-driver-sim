import { describe, expect, test } from "bun:test";
import { eventResearch } from "../src/events";
import { dispatch, forceEvent, plannedEventIds, plannedServiceMinutes, startShift } from "../src/sim";
import { EVENT_IDS, type EventId } from "../src/types";
import { hasOrder, play } from "./play";

describe("shift machine", () => {
  test("happy path walks 听单 → 接驾 → 等待 → 核验 → 行程 → 账单 → 评价 → 听单", () => {
    const { phases } = play("loop", "morning", (state) => state.stats.completed >= 1 && state.phase === "listening");
    expect(hasOrder(phases, ["listening", "pickup", "waiting", "boarding", "trip", "bill", "rating", "listening"])).toBe(true);
  });

  test("decline returns to listening", () => {
    let state = startShift("morning", "decline");
    for (let i = 0; i < 30 && state.modal?.eventId !== "offer"; i++) {
      if (state.modal) {
        const choice = state.modal.choices.find((item) => item.safe) ?? state.modal.choices[0]!;
        state = dispatch(state, { type: "choose", id: choice.id });
      } else state = dispatch(state, { type: "tick", minutes: 1 });
    }
    expect(state.modal?.eventId).toBe("offer");
    const offer = state.offers[0]!;
    expect(offer.origin.length).toBeGreaterThan(0);
    expect(offer.destination.length).toBeGreaterThan(0);
    expect(offer.estimateYuan).toBeGreaterThan(0);
    state = dispatch(state, { type: "choose", id: "decline" });
    expect(state.phase).toBe("listening");
    expect(state.stats.declines).toBe(1);
    expect(state.log.length).toBe(0);
    expect(state.modal).toBeNull();
  });

  test("at-fault cancel and no-fault cancel", () => {
    let state = startShift("peak", "cancel");
    for (let i = 0; i < 40 && state.phase !== "pickup"; i++) {
      if (state.modal) {
        const choice = state.modal.choices.find((item) => item.id === "accept") ?? state.modal.choices.find((item) => item.safe) ?? state.modal.choices[0]!;
        state = dispatch(state, { type: "choose", id: choice.id });
      } else state = dispatch(state, { type: "tick", minutes: 1 });
    }
    expect(state.phase).toBe("pickup");
    state = dispatch(state, { type: "cancel-order" });
    expect(state.modal?.eventId).toBe("cancel-ask");
    state = dispatch(state, { type: "choose", id: "cancel-fault" });
    expect(state.log.at(-1)?.result).toBe("有责取消");
    expect(state.stats.atFault).toBe(1);

    let waiting = startShift("morning", "nofault");
    waiting = forceEvent(waiting, "pax-cancel");
    expect(waiting.modal?.eventId).toBe("pax-cancel");
    waiting = dispatch(waiting, { type: "choose", id: "pax-report" });
    expect(waiting.log.at(-1)?.result).toBe("乘客取消");
    expect(waiting.phase === "listening" || waiting.phase === "summary").toBe(true);

    let reported = startShift("morning", "report-cancel");
    reported = forceEvent(reported, "cant-find");
    reported.contacts = 2;
    reported = dispatch(reported, { type: "choose", id: "find-cancel" });
    expect(reported.log.at(-1)?.result).toBe("无责取消");
  });

  test("end shift reaches 交班", () => {
    let state = startShift("morning", "end");
    state = dispatch(state, { type: "end-shift" });
    expect(state.modal?.eventId).toBe("end-ask");
    state = dispatch(state, { type: "choose", id: "end-now" });
    expect(state.phase).toBe("summary");
  });
});

describe("events and shift mix", () => {
  test("a deterministic shift contains 特惠 and a pre-pooled 拼车", () => {
    for (const seed of ["mix-seed", "another", "滨江-7"]) {
      const state = startShift("morning", seed);
      const categories = state.offers.map((offer) => offer.category);
      expect(categories).toContain("特惠");
      expect(categories).toContain("拼车");
      const pooled = state.offers.find((offer) => offer.category === "拼车");
      expect(pooled?.pooled).toBe(true);
      expect(pooled?.via).toBeTruthy();
      expect(plannedEventIds(state)).toEqual([...EVENT_IDS]);
      expect(plannedServiceMinutes(state)).toBeGreaterThan(240);
    }
  });

  test("all 12 event types open with 2 to 4 choices", () => {
    const base = startShift("night", "events");
    const variants: Partial<Record<EventId, string>> = {
      complaint: "odor",
      platform: "safety",
      rest: "4h",
    };
    for (const id of EVENT_IDS) {
      const opened = forceEvent(base, id, variants[id] ?? null);
      expect(opened.modal?.eventId).toBe(id);
      const count = opened.modal?.choices.length ?? 0;
      expect(count).toBeGreaterThanOrEqual(2);
      expect(count).toBeLessThanOrEqual(4);
      expect(eventResearch(id)).toContain("RESEARCH.md §4");
      for (const choice of opened.modal?.choices ?? []) {
        const after = dispatch(opened, { type: "choose", id: choice.id });
        expect(after.version).toBe(1);
      }
    }
  });

  test("platform variants and the 10 hour rest tier can open", () => {
    const base = startShift("morning", "variants");
    for (const variant of ["verify", "safety", "dispatch-reason", "health"]) {
      const opened = forceEvent(base, "platform", variant);
      expect(opened.modal?.variant).toBe(variant);
      expect(opened.modal?.choices.length).toBeGreaterThanOrEqual(2);
    }
    const longRest = forceEvent(base, "rest", "10h");
    expect(longRest.modal?.body).toContain("10 小时");
    const rested = dispatch(longRest, { type: "choose", id: "rest10-ok" });
    expect(rested.phase).toBe("rest");
    expect(rested.stats.rests).toBe(1);
    expect(rested.restUntil).toBe(base.clockMin + 360);
  });

  test("first odor feedback does not take simulated cash", () => {
    const base = startShift("morning", "odor");
    const opened = forceEvent(base, "complaint", "odor");
    for (const choice of opened.modal?.choices ?? []) {
      const after = dispatch(opened, { type: "choose", id: choice.id });
      expect(after.income).toBe(opened.income);
    }
    const argued = dispatch(opened, { type: "choose", id: "odor-argue" });
    expect(argued.stats.complaints).toBe(1);
    expect(argued.income).toBe(0);
  });

  test("a full morning can meet 特惠, 拼车 and every event", () => {
    const { state } = play("full-morning", "morning", (row) => row.phase === "summary");
    expect(state.phase).toBe("summary");
    const seenCats = new Set(state.log.map((item) => item.category));
    expect(seenCats.has("特惠") || state.offers.some((offer) => offer.category === "特惠") || state.log.length > 0).toBe(true);
    const offered = new Set<string>();
    for (const item of state.log) offered.add(item.category);
    expect(offered.has("特惠")).toBe(true);
    expect(offered.has("拼车")).toBe(true);
    for (const id of EVENT_IDS) expect(state.seenEvents).toContain(id);
    const bills = state.log.filter((item) => item.result === "完成");
    expect(bills.length).toBeGreaterThan(1);
    const rates = bills.map((item) => item.commissionRate);
    expect(rates.every((rate) => Math.abs(rate - 0.14) > 0.001)).toBe(true);
    expect(new Set(rates).size).toBeGreaterThan(1);
    expect(state.income).toBeGreaterThan(0);
    expect(state.stats.rests).toBeGreaterThan(0);
  });
});
