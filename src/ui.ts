import { DISCLAIMER, DRIVER, FARE_LABEL, gradeOf, SHIFTS } from "./city";
import { PHASE_LABEL, SCORE_NOTE, START_CTA, TAGLINE, TITLE } from "./copy";
import { esc, formatClock, formatHours, formatYuan } from "./format";
import { liveDriverYuan, phaseLabel } from "./sim";
import type { Offer, ShiftId, State } from "./types";

function offerOnCard(state: State): Offer | null {
  if (state.offer) return state.offer;
  if (state.modal?.eventId === "offer") return state.offers[0] ?? null;
  return null;
}

export function stageHtml(state: State): string {
  const rec = state.recording ? `<div class="rec">行程录音中</div>` : "";
  const pill = state.phase === "title" ? "滨江市 · 未出车" : phaseLabel(state.phase);
  return `${rec}<div class="pill">${esc(pill)}</div>`;
}

export function dashHtml(state: State): string {
  if (state.phase === "title") return "";
  const offer = offerOnCard(state);
  const live = liveDriverYuan(state);
  const remain = offer && (state.phase === "trip" || state.phase === "pickup")
    ? Math.max(0, state.legKm - state.progressKm)
    : null;
  return `
    <section class="card order-card">
      <header>${offer ? esc(offer.category) : "听单"}</header>
      ${offer ? orderBody(state, offer, remain) : `<p class="muted">车辆在滨江市巡游，等平台播单。起终点会先给你看。</p>`}
    </section>
    <section class="card fare-card">
      <header>${esc(FARE_LABEL)}</header>
      <div class="fare-num">${live == null ? "—" : formatYuan(live)}<small> 元</small></div>
      <p class="fare-sub">${fareSub(state, offer, remain)}</p>
      <div class="fare-row"><span>本程状态</span><b>${esc(PHASE_LABEL[state.phase] ?? "")}</b></div>
      <div class="fare-row"><span>乘客实付口径</span><b>到账后见账单</b></div>
    </section>
    <section class="card gauge-card">
      ${gauges(state)}
    </section>
  `;
}

function orderBody(state: State, offer: Offer, remain: number | null): string {
  const via = offer.via ? `<div class="od">先送 ${esc(offer.via)}</div>` : "";
  const where = state.phase === "pickup"
    ? `去接乘客 · 剩 ${remain?.toFixed(1) ?? "—"} km`
    : state.phase === "trip"
      ? `送往目的地 · 剩 ${remain?.toFixed(1) ?? "—"} km`
      : state.phase === "waiting"
        ? `免费等待 ${Math.max(0, state.freeWaitLeft).toFixed(1)} 分钟`
        : "当前订单";
  const surge = offer.surgeYuan > 0 ? `<span class="tag">加价 ${formatYuan(offer.surgeYuan)} 元</span>` : "";
  const fee = offer.dispatchYuan > 0 ? `<span class="tag">调度 ${formatYuan(offer.dispatchYuan)} 元</span>` : "";
  const pool = offer.pooled ? `<span class="tag">已拼好</span>` : "";
  return `
    <div class="where">${esc(where)}</div>
    <div class="od"><b>${esc(offer.origin)}</b> → <b>${esc(offer.destination)}</b></div>
    ${via}
    <div class="tags">${pool}${surge}${fee}<span class="tag">${esc(offer.reason)}</span></div>
    <div class="est">模拟预估 ${formatYuan(offer.estimateYuan)} 元 · ${offer.distanceKm.toFixed(1)} km</div>
    <div class="muted">尾号 ${esc(offer.tail)} · ${esc(offer.tripCode)} · 车牌 ${esc(DRIVER.plate)}</div>
    ${state.phase === "pickup" || state.phase === "waiting" || state.phase === "boarding" || state.phase === "trip"
      ? `<button type="button" class="ghost" data-act="cancel-order">取消这单</button>`
      : ""}
  `;
}

function fareSub(state: State, offer: Offer | null, remain: number | null): string {
  if (state.phase === "trip" && offer) {
    return offer.category === "快车"
      ? `按模拟里程走，还剩 ${remain?.toFixed(1) ?? "0"} 公里`
      : "一口价已锁定，附加费另计";
  }
  if (offer && state.modal?.eventId === "offer") return "看清起终点再接";
  if (state.phase === "listening") return "收入要等完单才入账";
  if (state.phase === "charging") return "江心充电站";
  if (state.phase === "rest") return "模拟规则：先休息，再听单";
  return "人民币 · 元";
}

function gauges(state: State): string {
  const shift = state.shift ? SHIFTS[state.shift] : null;
  const grade = gradeOf(state.service);
  return `
    <div class="speed"><b>${state.speedKmh}</b><span>km/h</span></div>
    <div class="chips">
      <span>${esc(state.traffic)}</span>
      <span>${esc(state.weather)}</span>
      <span>${esc(shift?.name ?? "")}</span>
    </div>
    <div class="clock">${formatClock(state.clockMin)}</div>
    <label>电量 ${Math.round(state.battery)}%</label>
    <div class="bar"><i style="width:${Math.max(0, Math.min(100, state.battery))}%"></i></div>
    <label>服务分 ${esc(grade)} · ${Math.round(state.service)} <small>${esc(SCORE_NOTE)}</small></label>
    <div class="bar service"><i style="width:${Math.max(0, Math.min(100, state.service))}%"></i></div>
    <p class="muted">连续服务 ${esc(formatHours(state.serviceMin))} · 计费 ${esc(formatHours(state.billableMin))}</p>
  `;
}

export function chromeHtml(state: State): string {
  if (state.phase === "title") return "";
  return `
    <div class="topbar">
      <div class="income">本班收入 <b>${formatYuan(state.income)}</b> 元</div>
      <div class="top-actions">
        <button type="button" data-act="speed">${state.speedMult}x</button>
        <button type="button" data-act="sound">${state.sound ? "音效开" : "音效关"}</button>
        <button type="button" data-act="pause">${state.paused ? "继续" : "暂停"}</button>
        <button type="button" data-act="end-shift">交班</button>
      </div>
    </div>
    ${state.toast ? `<div class="toast">${esc(state.toast)}</div>` : ""}
  `;
}

export function overlayHtml(state: State, picked: ShiftId): string {
  if (state.phase === "title") return titleHtml(picked);
  if (state.phase === "summary") return receiptHtml(state);
  if (state.modal) return modalHtml(state);
  return "";
}

function titleHtml(picked: ShiftId): string {
  const shifts = (Object.keys(SHIFTS) as ShiftId[]).map((id) => {
    const item = SHIFTS[id];
    const on = id === picked ? "on" : "";
    return `<button type="button" class="shift ${on}" data-act="shift" data-id="${id}"><b>${esc(item.name)}</b><span>${esc(item.blurb)}</span></button>`;
  }).join("");
  return `
    <div class="title-wrap">
      <section class="title-card">
        <p class="eyebrow">滨江市 · 新能源快车</p>
        <h1>${esc(TITLE)}</h1>
        <p class="tag">${esc(TAGLINE)}</p>
        <p class="legal">${esc(DISCLAIMER)}</p>
        <article class="driver">
          <div>
            <b>${esc(DRIVER.name)}</b>
            <span>${esc(DRIVER.level)} ${esc(DRIVER.rank)}</span>
          </div>
          <div>
            <b>${esc(DRIVER.plate)}</b>
            <span>${esc(DRIVER.vehicle)}</span>
          </div>
          <div class="wide">
            <span>服务分 ${esc(gradeOf(82))} · ${esc(SCORE_NOTE)}</span>
            <div class="bar service"><i style="width:82%"></i></div>
          </div>
        </article>
        <div class="shifts">${shifts}</div>
        <button type="button" class="primary" data-act="start">${esc(START_CTA)}</button>
      </section>
    </div>
  `;
}

function modalHtml(state: State): string {
  const modal = state.modal;
  if (!modal) return "";
  const lines = state.bill && modal.eventId === "bill"
    ? `<ul class="bill-lines">${state.bill.lines.map((line) => `<li><span>${esc(line.name)}</span><b>${formatYuan(line.yuan)}</b></li>`).join("")}</ul>`
    : "";
  const choices = modal.choices.map((choice) => {
    const chips = choice.chips.map((chip) => `<i class="chip ${chip.tone}">${esc(chip.text)}</i>`).join("");
    return `<button type="button" class="choice" data-act="choose" data-id="${esc(choice.id)}"><span>${esc(choice.label)}</span><span class="chips">${chips}</span></button>`;
  }).join("");
  return `
    <div class="modal-back">
      <section class="modal" role="dialog" aria-modal="true">
        <h2>${esc(modal.title)}</h2>
        <p>${esc(modal.body).replaceAll("\n", "<br>")}</p>
        ${lines}
        <div class="choices">${choices}</div>
      </section>
    </div>
  `;
}

function receiptHtml(state: State): string {
  const delta = Math.round(state.service - state.serviceStart);
  const deltaText = `${delta > 0 ? "+" : ""}${delta}`;
  const rates = state.log.filter((item) => item.result === "完成").map((item) => item.commissionRate);
  let rateNote = "本班没有完成订单。抽成仍按单计算，不是固定比例。";
  if (rates.length) {
    const min = Math.min(...rates);
    const max = Math.max(...rates);
    rateNote = `完成订单的模拟抽成大约在 ${(min * 100).toFixed(1)}% 到 ${(max * 100).toFixed(1)}% 之间${min < 0 ? "，含补贴（负抽成）" : ""}。不是固定比例。`;
  }
  const rows = [
    ["完单数", String(state.stats.completed)],
    ["模拟收入", `${formatYuan(state.income)} 元`],
    ["服务分", `${gradeOf(state.serviceStart)} → ${gradeOf(state.service)}（${deltaText}）`],
    ["有责取消", String(state.stats.atFault)],
    ["无责与乘客取消", String(state.stats.noFault + state.stats.paxCancel)],
    ["投诉记录", String(state.stats.complaints)],
    ["充电", String(state.stats.charges)],
    ["强制休息", String(state.stats.rests)],
    ["婉拒", String(state.stats.declines)],
  ];
  const log = state.log.map((item, index) => {
    const via = item.via ? `，经 ${esc(item.via)}` : "";
    return `<li><b>${index + 1}. ${esc(item.clock)} ${esc(item.category)}</b> ${esc(item.result)} ${formatYuan(item.driverYuan)} 元<br>${esc(item.origin)} → ${esc(item.destination)}${via} · ${item.km.toFixed(1)} km<br><span>${esc(item.note)}</span></li>`;
  }).join("");
  const tone = state.income > 0 ? "profit" : state.income < 0 ? "loss" : "flat";
  const shiftName = state.shift ? SHIFTS[state.shift].name : "";
  return `
    <div class="modal-back dim">
      <article class="receipt">
        <h2>滨江市出车收据</h2>
        <p class="receipt-sub">${esc(shiftName)} · ${esc(DRIVER.name)} · ${esc(DRIVER.plate)}<br>${formatClock(state.shiftStart)} – ${formatClock(state.clockMin)}</p>
        <p class="big ${tone}">${state.income > 0 ? "+" : ""}${formatYuan(state.income)}</p>
        <p>模拟收入（元）· ${esc(FARE_LABEL)}</p>
        <dl>
          ${rows.map(([k, v]) => `<div><dt>${esc(k!)}</dt><dd>${esc(v!)}</dd></div>`).join("")}
        </dl>
        <p class="rate-note">${esc(rateNote)} ${esc(FARE_LABEL)}。</p>
        <details>
          <summary>行程列表（${state.log.length}）</summary>
          <ol>${log || "<li>这一班还没有订单记录。</li>"}</ol>
        </details>
        <button type="button" class="primary" data-act="new-shift">再出一班</button>
        <p class="legal">${esc(DISCLAIMER)}</p>
      </article>
    </div>
  `;
}
