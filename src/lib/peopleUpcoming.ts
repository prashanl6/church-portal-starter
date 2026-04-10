function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

/**
 * Inclusive window: from start of `today` through end of the day that is (nDays - 1) days later.
 * E.g. nDays=10 → today .. today+9 (10 calendar days).
 */
export function isOccasionInNextNDays(eventDate: Date, today: Date, nDays: number): boolean {
  const start = startOfDay(today);
  const end = endOfDay(new Date(today));
  end.setDate(end.getDate() + nDays - 1);

  // Birth/anniversary dates from the DB are typically UTC midnight (HTML date input → ISO).
  // Local getMonth/getDate would shift the calendar day behind UTC (e.g. US timezones).
  const m = eventDate.getUTCMonth();
  const d = eventDate.getUTCDate();
  const y = today.getFullYear();
  const thisYear = new Date(y, m, d, 12, 0, 0, 0);
  const nextYear = new Date(y + 1, m, d, 12, 0, 0, 0);

  return (
    (thisYear.getTime() >= start.getTime() && thisYear.getTime() <= end.getTime()) ||
    (nextYear.getTime() >= start.getTime() && nextYear.getTime() <= end.getTime())
  );
}

/**
 * `storedOccasionDate`: birthDate / anniversaryDate from Prisma (date-only as UTC midnight).
 * `localCalendarDay`: a Date representing a calendar day in the runtime's local timezone.
 */
export function sameMonthDay(storedOccasionDate: Date, localCalendarDay: Date): boolean {
  return (
    storedOccasionDate.getUTCMonth() === localCalendarDay.getMonth() &&
    storedOccasionDate.getUTCDate() === localCalendarDay.getDate()
  );
}

/** Inclusive calendar days from `from` through `to` (local), using date-only comparison. */
export function* eachCalendarDayInclusive(from: Date, to: Date): Generator<Date> {
  const start = startOfDay(from);
  const end = startOfDay(to);
  if (start.getTime() > end.getTime()) return;
  const cur = new Date(start);
  while (cur.getTime() <= end.getTime()) {
    yield new Date(cur);
    cur.setDate(cur.getDate() + 1);
  }
}

/** True if month/day of `occasion` matches any calendar day in [from, to] inclusive. */
export function occasionMatchesAnyDayInRange(occasion: Date, from: Date, to: Date): boolean {
  for (const d of eachCalendarDayInclusive(from, to)) {
    if (sameMonthDay(occasion, d)) return true;
  }
  return false;
}
