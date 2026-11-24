import { clearShift, loadShift, saveShift } from "./storage";
import { dispatch, titleState } from "./sim";
import type { ShiftId, State } from "./types";
import { chromeHtml, dashHtml, overlayHtml, stageHtml } from "./ui";
import { paintStreet } from "./world";
import "./style.css";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("缺少根节点");

app.innerHTML = `
  <div id="stage">
    <canvas id="road"></canvas>
    <div id="stage-ui"></div>
  </div>
  <div id="dash"></div>
  <div id="overlay"></div>
`;

const canvasEl = document.querySelector<HTMLCanvasElement>("#road");
const stageEl = document.querySelector<HTMLDivElement>("#stage-ui");
const dashEl = document.querySelector<HTMLDivElement>("#dash");
const overlayEl = document.querySelector<HTMLDivElement>("#overlay");
if (!canvasEl || !stageEl || !dashEl || !overlayEl) throw new Error("界面没有装好");
const canvas: HTMLCanvasElement = canvasEl;
const stageUi: HTMLDivElement = stageEl;
const dash: HTMLDivElement = dashEl;
const overlay: HTMLDivElement = overlayEl;
const context = canvas.getContext("2d");
if (!context) throw new Error("画布不可用");
const ctx: CanvasRenderingContext2D = context;

let state: State = loadShift(localStorage) ?? titleState();
let picked: ShiftId = "morning";
let audio: AudioContext | null = null;

function blip(): void {
  if (!state.sound) return;
  const Ctx = window.AudioContext;
  if (!audio) audio = new Ctx();
  if (audio.state === "suspended") void audio.resume();
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.frequency.value = 520;
  gain.gain.value = 0.03;
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start();
  osc.stop(audio.currentTime + 0.05);
}

function persist(): void {
  if (state.phase === "title") clearShift(localStorage);
  else saveShift(localStorage, state);
}

function drawKey(): string {
  const offer = state.offer?.id ?? state.offers[0]?.id ?? "";
  return [
    state.phase,
    state.modal?.title ?? "",
    state.modal?.choices.map((item) => item.id).join(",") ?? "",
    Math.floor(state.clockMin),
    Math.round(state.battery),
    state.income.toFixed(2),
    state.toast ?? "",
    state.paused,
    state.speedMult,
    state.sound,
    state.speedKmh,
    offer,
    state.log.length,
    state.recording,
    state.stats.completed,
    state.freeWaitLeft.toFixed(1),
    picked,
  ].join("|");
}

let rendered = "";
function render(): void {
  const key = drawKey();
  if (key === rendered) return;
  rendered = key;
  stageUi.innerHTML = chromeHtml(state) + stageHtml(state);
  dash.innerHTML = dashHtml(state);
  overlay.innerHTML = overlayHtml(state, picked);
  persist();
}

function fit(): void {
  const rect = canvas.parentElement?.getBoundingClientRect();
  if (!rect) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

const minutesPerSecond: Partial<Record<State["phase"], number>> = {
  listening: 2,
  pickup: 2,
  trip: 2,
  waiting: 0.45,
  boarding: 0,
  rest: 4,
  charging: 3,
  bill: 0,
  rating: 0,
  "depart-check": 0,
  summary: 0,
  title: 0,
};

let last = performance.now();
function frame(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const rate = (minutesPerSecond[state.phase] ?? 0) * state.speedMult;
  if (rate > 0 && !state.paused && !state.modal) {
    state = dispatch(state, { type: "tick", minutes: dt * rate });
  }
  fit();
  const rect = canvas.getBoundingClientRect();
  paintStreet(ctx, rect.width, rect.height, state, now);
  render();
  requestAnimationFrame(frame);
}

app.addEventListener("click", (event) => {
  const target = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-act]");
  if (!target) return;
  const act = target.dataset.act;
  if (act === "shift") {
    const id = target.dataset.id;
    if (id === "morning" || id === "peak" || id === "night") {
      picked = id;
      rendered = "";
    }
    return;
  }
  if (act === "start") {
    state = dispatch(state, { type: "start", shift: picked, seed: `bj-${Date.now().toString(36)}` });
    blip();
    rendered = "";
    return;
  }
  if (act === "choose") {
    const id = target.dataset.id;
    if (!id) return;
    state = dispatch(state, { type: "choose", id });
    blip();
    rendered = "";
    return;
  }
  if (act === "speed") state = dispatch(state, { type: "speed" });
  else if (act === "sound") state = dispatch(state, { type: "sound" });
  else if (act === "pause") state = dispatch(state, { type: "pause" });
  else if (act === "end-shift") state = dispatch(state, { type: "end-shift" });
  else if (act === "cancel-order") state = dispatch(state, { type: "cancel-order" });
  else if (act === "new-shift") state = dispatch(state, { type: "new-shift" });
  rendered = "";
  blip();
});

window.addEventListener("resize", () => { rendered = ""; fit(); });
fit();
requestAnimationFrame(frame);
