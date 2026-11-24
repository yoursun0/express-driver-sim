import type { State } from "./types";

const SIGNS = ["江湾商圈", "市一医院", "高铁站", "机场方向", "充电站", "夜港排档", "会展中心", "大学城", "江畔公园", "老城菜场"];

export function paintStreet(ctx: CanvasRenderingContext2D, width: number, height: number, state: State, now: number): void {
  const scroll = state.phase === "title" || state.phase === "summary" ? now / 40 : state.odometerKm * 80 + now / 200;
  const hour = ((Math.floor(state.clockMin) % 1440) + 1440) % 1440 / 60;
  const night = hour >= 19 || hour < 6;
  const dusk = !night && (hour >= 17 || hour < 7);
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  if (night) {
    sky.addColorStop(0, "#151a33");
    sky.addColorStop(1, "#3a3158");
  } else if (dusk) {
    sky.addColorStop(0, "#f0a36a");
    sky.addColorStop(0.45, "#f3c9a0");
    sky.addColorStop(1, "#8aa4c4");
  } else {
    sky.addColorStop(0, "#8ec8ef");
    sky.addColorStop(0.55, "#d5ecf4");
    sky.addColorStop(1, "#c5d5c4");
  }
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  const horizon = height * 0.42;
  ctx.fillStyle = night ? "#242038" : "#9eb0a4";
  ctx.beginPath();
  ctx.moveTo(0, horizon + 8);
  ctx.quadraticCurveTo(width * 0.3, horizon - 18, width * 0.55, horizon + 4);
  ctx.quadraticCurveTo(width * 0.75, horizon + 20, width, horizon - 6);
  ctx.lineTo(width, horizon + 30);
  ctx.lineTo(0, horizon + 30);
  ctx.fill();

  drawSide(ctx, width, height, horizon, scroll, night, -1);
  drawSide(ctx, width, height, horizon, scroll, night, 1);

  const roadTop = horizon + 8;
  const roadBottom = height;
  ctx.fillStyle = night ? "#2a2e38" : "#3d4450";
  ctx.beginPath();
  ctx.moveTo(width * 0.46, roadTop);
  ctx.lineTo(width * 0.54, roadTop);
  ctx.lineTo(width * 0.92, roadBottom);
  ctx.lineTo(width * 0.08, roadBottom);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(240, 196, 120, 0.85)";
  ctx.lineWidth = 2;
  ctx.setLineDash([18, 16]);
  ctx.lineDashOffset = -((scroll * 2) % 34);
  ctx.beginPath();
  ctx.moveTo(width * 0.5, roadTop + 6);
  ctx.lineTo(width * 0.5, roadBottom);
  ctx.stroke();
  ctx.setLineDash([]);

  const carY = horizon + height * 0.08;
  ctx.fillStyle = night ? "#1b1f2a" : "#2c3340";
  roundRect(ctx, width * 0.47, carY, width * 0.06, height * 0.05, 4);
  ctx.fill();
  ctx.fillStyle = night ? "#9fd7ff" : "#d7e4ee";
  ctx.fillRect(width * 0.478, carY + 2, width * 0.02, height * 0.018);
  ctx.fillRect(width * 0.502, carY + 2, width * 0.02, height * 0.018);

  ctx.fillStyle = "#2a3038";
  ctx.fillRect(0, height - 28, width, 28);
  ctx.fillStyle = "#e0a15a";
  ctx.fillRect(0, height - 28, width, 3);

  if (state.recording) {
    const mx = width * 0.5;
    const my = 18;
    ctx.fillStyle = "rgba(12,14,18,0.72)";
    roundRect(ctx, mx - 36, my, 72, 28, 6);
    ctx.fill();
    ctx.strokeStyle = "rgba(224,161,90,0.8)";
    ctx.strokeRect(mx - 36, my, 72, 28);
    ctx.fillStyle = night ? "#d9dee8" : "#f2e6d4";
    ctx.beginPath();
    ctx.arc(mx, my + 16, 6, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawSide(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  horizon: number,
  scroll: number,
  night: boolean,
  dir: number,
): void {
  for (let i = 0; i < 7; i++) {
    const depth = ((i * 0.16 + (scroll * 0.01) % 0.16) % 1.05);
    const t = depth;
    const y = horizon + t * (height * 0.5);
    const scale = 0.25 + t * 1.15;
    const bw = 70 * scale;
    const bh = 110 * scale;
    const x = width * 0.5 + dir * (40 + t * width * 0.48) - (dir > 0 ? bw : 0);
    const palette = night
      ? ["#2c3148", "#3a3350", "#243044", "#3d3a55"]
      : ["#d9d3c8", "#c5d0d4", "#e4d2bc", "#c9c4de"];
    ctx.fillStyle = palette[i % palette.length]!;
    ctx.fillRect(x, y - bh, bw, bh);
    ctx.fillStyle = night ? "rgba(255, 196, 120, 0.35)" : "rgba(80, 100, 120, 0.25)";
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 2; col++) {
        if ((i + row + col) % 3 === 0) continue;
        ctx.fillRect(x + 8 * scale + col * 28 * scale, y - bh + 12 * scale + row * 22 * scale, 14 * scale, 10 * scale);
      }
    }
    if (t > 0.25) {
      const label = SIGNS[(i + (dir > 0 ? 3 : 0)) % SIGNS.length]!;
      ctx.fillStyle = night ? "#f0b56a" : "#8c3d2f";
      ctx.fillRect(x, y - 18 * scale, bw, 16 * scale);
      ctx.fillStyle = "#fff8ee";
      ctx.font = `${Math.max(10, 11 * scale)}px "Microsoft YaHei", "Noto Sans SC", sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(label, x + bw / 2, y - 6 * scale);
    }
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
