export function parseYMD(s: string): Date {
  // s = YYYY-MM-DD
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function formatYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isWeekend(d: Date) {
  const w = d.getDay(); // 0 Sun .. 6 Sat
  return w === 0 || w === 6;
}

export function businessDaysBetweenInclusive(startYmd: string, endYmd: string): number {
  const start = parseYMD(startYmd);
  const end = parseYMD(endYmd);
  if (end < start) return 0;

  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    if (!isWeekend(cur)) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}
