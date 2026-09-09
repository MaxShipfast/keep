export function dateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

/** 0 = Monday … 6 = Sunday (matches the shot-day picker order) */
export function weekdayMon0(d: Date = new Date()): number {
  return (d.getDay() + 6) % 7;
}

export const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const DAY_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** Dates (Mon-first) for the current calendar week. */
export function currentWeekDates(): Date[] {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - weekdayMon0(today));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}
