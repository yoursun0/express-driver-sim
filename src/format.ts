export function yuan(n: number): number {
  return Math.round(n * 100) / 100;
}

export function formatYuan(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}${Math.abs(n).toFixed(2)}`;
}

export function formatClock(min: number): string {
  const m = ((Math.floor(min) % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export function formatHours(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.floor(min % 60);
  if (h <= 0) return `${m} 分钟`;
  return `${h} 小时 ${m} 分钟`;
}

export function esc(text: string): string {
  return text.replace(/[&<>"']/g, (ch) => {
    if (ch === "&") return "&amp;";
    if (ch === "<") return "&lt;";
    if (ch === ">") return "&gt;";
    if (ch === '"') return "&quot;";
    return "&#39;";
  });
}
