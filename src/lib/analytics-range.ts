import type { RangeKey } from "./mock-analytics";

export type DateRange = { from: Date; to: Date; days: number };

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function resolveRange(
  range: RangeKey,
  from?: string,
  to?: string,
): DateRange {
  const now = new Date();

  if (range === "custom" && from && to) {
    const f = startOfDay(new Date(from));
    const t = endOfDay(new Date(to));
    const days = Math.max(
      1,
      Math.round((+t - +f) / 86_400_000),
    );
    return { from: f, to: t, days };
  }

  switch (range) {
    case "today": {
      return { from: startOfDay(now), to: endOfDay(now), days: 1 };
    }
    case "yesterday": {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return { from: startOfDay(y), to: endOfDay(y), days: 1 };
    }
    case "last7": {
      const f = new Date(now);
      f.setDate(f.getDate() - 6);
      return { from: startOfDay(f), to: endOfDay(now), days: 7 };
    }
    case "thisMonth": {
      const f = new Date(now.getFullYear(), now.getMonth(), 1);
      const days = Math.max(
        1,
        Math.round((+endOfDay(now) - +startOfDay(f)) / 86_400_000) + 1,
      );
      return { from: startOfDay(f), to: endOfDay(now), days };
    }
    case "lastMonth": {
      const f = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const t = new Date(now.getFullYear(), now.getMonth(), 0);
      const days = Math.max(
        1,
        Math.round((+endOfDay(t) - +startOfDay(f)) / 86_400_000) + 1,
      );
      return { from: startOfDay(f), to: endOfDay(t), days };
    }
    default: {
      return { from: startOfDay(now), to: endOfDay(now), days: 1 };
    }
  }
}
