// ============================================================
// カレンダー表示用の日付ユーティリティ（純粋関数）
// 日付は "YYYY-MM-DD" 文字列で扱い、ローカル日付として計算する
// （new Date("YYYY-MM-DD") はUTC解釈でずれるため使わない）
// ============================================================

export type DayCell = {
  date: string;      // "YYYY-MM-DD"
  day: number;       // 1-31
  weekday: number;   // 0=日 … 6=土
  inMonth: boolean;  // 表示中の月に属するか
  isToday: boolean;
};

export const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"] as const;

const pad = (n: number) => String(n).padStart(2, "0");

export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDateStr(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function todayStr(now: Date = new Date()): string {
  return toDateStr(now);
}

export function addDays(dateStr: string, n: number): string {
  const d = parseDateStr(dateStr);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

// month は 0-11。月をまたぐ加減算に対応
export function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const total = year * 12 + month + delta;
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 };
}

export function formatMonth(year: number, month: number): string {
  return `${year}年${month + 1}月`;
}

function cell(d: Date, inMonth: boolean, today: string): DayCell {
  const date = toDateStr(d);
  return { date, day: d.getDate(), weekday: d.getDay(), inMonth, isToday: date === today };
}

// 月表示のグリッド（週ごとの配列。5〜6週）。weekStart: 0=日曜始まり / 1=月曜始まり
export function monthGrid(year: number, month: number, weekStart = 0, now: Date = new Date()): DayCell[][] {
  const today = todayStr(now);
  const first = new Date(year, month, 1);
  const offset = (first.getDay() - weekStart + 7) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weekCount = Math.ceil((offset + daysInMonth) / 7);

  const weeks: DayCell[][] = [];
  for (let w = 0; w < weekCount; w++) {
    const week: DayCell[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(year, month, 1 - offset + w * 7 + i);
      week.push(cell(d, d.getMonth() === month && d.getFullYear() === year, today));
    }
    weeks.push(week);
  }
  return weeks;
}

// 指定日を含む週（7日）
export function weekOf(dateStr: string, weekStart = 0, now: Date = new Date()): DayCell[] {
  const today = todayStr(now);
  const base = parseDateStr(dateStr);
  const offset = (base.getDay() - weekStart + 7) % 7;
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() - offset + i);
    return cell(d, true, today);
  });
}

// "10月6日(火)" 形式
export function formatDay(dateStr: string): string {
  const d = parseDateStr(dateStr);
  return `${d.getMonth() + 1}月${d.getDate()}日(${WEEKDAY_LABELS[d.getDay()]})`;
}

// 日付 → その日のアイテム配列
export function groupByDate<T extends { deadline?: string | null }>(items: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const it of items) {
    if (!it.deadline) continue;
    const arr = map.get(it.deadline);
    if (arr) arr.push(it);
    else map.set(it.deadline, [it]);
  }
  return map;
}
