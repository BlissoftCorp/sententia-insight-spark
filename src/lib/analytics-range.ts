import type { RangeKey } from "./mock-analytics";

export type DateRange = { from: Date; to: Date; days: number };

const DEFAULT_TZ = "America/Bogota";

export function getAppTimezone(): string {
  return process.env.APP_TIMEZONE || DEFAULT_TZ;
}

/** Calendar date (year/month/day) of `instant` as observed in `tz`. */
function zonedYMD(instant: Date, tz: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  return {
    year: +parts.find((p) => p.type === "year")!.value,
    month: +parts.find((p) => p.type === "month")!.value,
    day: +parts.find((p) => p.type === "day")!.value,
  };
}

/**
 * UTC instant whose wall-clock time in `tz` is the given Y/M/D h:m:s.
 * Handles arbitrary IANA zones (DST-safe) via a single-correction Intl round-trip.
 */
function zonedDateToInstant(
  y: number,
  m: number,
  d: number,
  h: number,
  mi: number,
  s: number,
  tz: string,
): Date {
  const guessUtc = Date.UTC(y, m - 1, d, h, mi, s);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(guessUtc));
  const gy = +parts.find((p) => p.type === "year")!.value;
  const gm = +parts.find((p) => p.type === "month")!.value;
  const gd = +parts.find((p) => p.type === "day")!.value;
  const gh = +parts.find((p) => p.type === "hour")!.value % 24;
  const gmi = +parts.find((p) => p.type === "minute")!.value;
  const gs = +parts.find((p) => p.type === "second")!.value;
  const asIfUtc = Date.UTC(gy, gm - 1, gd, gh, gmi, gs);
  const offsetMs = asIfUtc - guessUtc;
  return new Date(guessUtc - offsetMs);
}

function startOfDayZ(y: number, m: number, d: number, tz: string) {
  return zonedDateToInstant(y, m, d, 0, 0, 0, tz);
}
function endOfDayZ(y: number, m: number, d: number, tz: string) {
  return new Date(zonedDateToInstant(y, m, d, 23, 59, 59, tz).getTime() + 999);
}

function addDaysYMD(y: number, m: number, d: number, delta: number) {
  const t = new Date(Date.UTC(y, m - 1, d));
  t.setUTCDate(t.getUTCDate() + delta);
  return {
    year: t.getUTCFullYear(),
    month: t.getUTCMonth() + 1,
    day: t.getUTCDate(),
  };
}

function parseYMD(s: string) {
  // Accept "YYYY-MM-DD" or ISO. Use only the calendar date portion.
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return { year: +m[1], month: +m[2], day: +m[3] };
  const d = new Date(s);
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

export function resolveRange(
  range: RangeKey,
  from?: string,
  to?: string,
  tz: string = getAppTimezone(),
): DateRange {
  const today = zonedYMD(new Date(), tz);

  if (range === "custom" && from && to) {
    const f = parseYMD(from);
    const t = parseYMD(to);
    const fromInstant = startOfDayZ(f.year, f.month, f.day, tz);
    const toInstant = endOfDayZ(t.year, t.month, t.day, tz);
    const days = Math.max(
      1,
      Math.round((+toInstant - +fromInstant) / 86_400_000),
    );
    return { from: fromInstant, to: toInstant, days };
  }

  switch (range) {
    case "today": {
      return {
        from: startOfDayZ(today.year, today.month, today.day, tz),
        to: endOfDayZ(today.year, today.month, today.day, tz),
        days: 1,
      };
    }
    case "yesterday": {
      const y = addDaysYMD(today.year, today.month, today.day, -1);
      return {
        from: startOfDayZ(y.year, y.month, y.day, tz),
        to: endOfDayZ(y.year, y.month, y.day, tz),
        days: 1,
      };
    }
    case "last7": {
      const f = addDaysYMD(today.year, today.month, today.day, -6);
      return {
        from: startOfDayZ(f.year, f.month, f.day, tz),
        to: endOfDayZ(today.year, today.month, today.day, tz),
        days: 7,
      };
    }
    case "thisMonth": {
      const f = { year: today.year, month: today.month, day: 1 };
      return {
        from: startOfDayZ(f.year, f.month, f.day, tz),
        to: endOfDayZ(today.year, today.month, today.day, tz),
        days: today.day,
      };
    }
    case "lastMonth": {
      const firstThis = { year: today.year, month: today.month, day: 1 };
      const lastPrev = addDaysYMD(firstThis.year, firstThis.month, firstThis.day, -1);
      const firstPrev = { year: lastPrev.year, month: lastPrev.month, day: 1 };
      return {
        from: startOfDayZ(firstPrev.year, firstPrev.month, firstPrev.day, tz),
        to: endOfDayZ(lastPrev.year, lastPrev.month, lastPrev.day, tz),
        days: lastPrev.day,
      };
    }
    case "allTime": {
      const toInstant = endOfDayZ(today.year, today.month, today.day, tz);
      const fromInstant = new Date(0);
      const days = Math.max(
        1,
        Math.round((+toInstant - +fromInstant) / 86_400_000),
      );
      return { from: fromInstant, to: toInstant, days };
    }
    default: {
      return {
        from: startOfDayZ(today.year, today.month, today.day, tz),
        to: endOfDayZ(today.year, today.month, today.day, tz),
        days: 1,
      };
    }
  }
}
