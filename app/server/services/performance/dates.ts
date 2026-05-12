import { format } from "date-fns";

/** Generate every YYYY-MM-DD string between two dates (inclusive). */
export function fillDailyKeys(from: string, to: string): string[] {
  const keys: string[] = [];
  const d = new Date(from + "T00:00:00");
  const end = new Date(to + "T00:00:00");
  while (d <= end) {
    keys.push(format(d, "yyyy-MM-dd"));
    d.setDate(d.getDate() + 1);
  }
  return keys;
}

/** Generate week-start keys from firstWeek to current week. */
export function fillWeeklyKeys(from: string, to: string): string[] {
  const keys: string[] = [];
  const d = new Date(from + "T00:00:00");
  const end = new Date(to + "T00:00:00");
  while (d <= end) {
    keys.push(format(d, "yyyy-MM-dd"));
    d.setDate(d.getDate() + 7);
  }
  return keys;
}

/** Generate every YYYY-MM key between two months (inclusive). */
export function fillMonthlyKeys(from: string, to: string): string[] {
  const keys: string[] = [];
  let [y, m] = from.split("-").map(Number);
  const [ey, em] = to.split("-").map(Number);
  while (y < ey || (y === ey && m <= em)) {
    keys.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return keys;
}
