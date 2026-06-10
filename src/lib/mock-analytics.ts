import { format, subDays } from "date-fns";

export type RangeKey =
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "thisMonth"
  | "lastMonth"
  | "allTime"
  | "custom";

export type Kpis = {
  newUsers: { value: number; delta: number };
  activeUsers: { value: number; delta: number };
  queries: { value: number; delta: number };
  payments: { value: number; delta: number };
};

const TABLE: Record<Exclude<RangeKey, "custom">, Kpis> = {
  today: {
    newUsers: { value: 42, delta: 8.2 },
    activeUsers: { value: 318, delta: 4.1 },
    queries: { value: 1_284, delta: 12.6 },
    payments: { value: 27, delta: -2.3 },
  },
  yesterday: {
    newUsers: { value: 39, delta: 1.2 },
    activeUsers: { value: 305, delta: -3.0 },
    queries: { value: 1_141, delta: 5.4 },
    payments: { value: 31, delta: 6.1 },
  },
  last7: {
    newUsers: { value: 287, delta: 11.4 },
    activeUsers: { value: 2_140, delta: 7.6 },
    queries: { value: 8_932, delta: 14.8 },
    payments: { value: 198, delta: 9.2 },
  },
  last30: {
    newUsers: { value: 1_230, delta: 5.2 },
    activeUsers: { value: 9_100, delta: 4.1 },
    queries: { value: 38_200, delta: 7.8 },
    payments: { value: 820, delta: 3.5 },
  },
  thisMonth: {
    newUsers: { value: 1_204, delta: 18.9 },
    activeUsers: { value: 9_420, delta: 12.3 },
    queries: { value: 38_710, delta: 22.1 },
    payments: { value: 842, delta: 16.4 },
  },
  lastMonth: {
    newUsers: { value: 1_012, delta: 6.5 },
    activeUsers: { value: 8_390, delta: 3.4 },
    queries: { value: 31_700, delta: 9.7 },
    payments: { value: 736, delta: 4.2 },
  },
  allTime: {
    newUsers: { value: 12_540, delta: 0 },
    activeUsers: { value: 48_210, delta: 0 },
    queries: { value: 312_984, delta: 0 },
    payments: { value: 6_120, delta: 0 },
  },
};

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

export function getKpis(range: RangeKey, from?: string, to?: string): Kpis {
  if (range !== "custom") return TABLE[range];
  const seedSrc = `${from ?? ""}|${to ?? ""}`;
  let seed = 0;
  for (let i = 0; i < seedSrc.length; i++) seed = (seed * 31 + seedSrc.charCodeAt(i)) >>> 0;
  const rnd = seeded(seed || 7);
  const days = from && to ? Math.max(1, Math.ceil((+new Date(to) - +new Date(from)) / 86_400_000) + 1) : 7;
  const scale = days;
  return {
    newUsers: { value: Math.round(35 * scale * (0.8 + rnd() * 0.6)), delta: +(rnd() * 30 - 10).toFixed(1) },
    activeUsers: { value: Math.round(280 * scale * (0.8 + rnd() * 0.6)), delta: +(rnd() * 25 - 8).toFixed(1) },
    queries: { value: Math.round(1_200 * scale * (0.8 + rnd() * 0.6)), delta: +(rnd() * 35 - 5).toFixed(1) },
    payments: { value: Math.round(1_300 * scale * (0.8 + rnd() * 0.6)), delta: +(rnd() * 30 - 10).toFixed(1) },
  };
}

export type TrendPoint = {
  date: string;
  label: string;
  newUsers: number;
  queries: number;
  payments: number;
};

export function getLast7Days(): TrendPoint[] {
  const base = [
    { newUsers: 28, queries: 1_020, payments: 22 },
    { newUsers: 35, queries: 1_180, payments: 26 },
    { newUsers: 31, queries: 1_090, payments: 31 },
    { newUsers: 48, queries: 1_420, payments: 24 },
    { newUsers: 44, queries: 1_360, payments: 35 },
    { newUsers: 39, queries: 1_540, payments: 33 },
    { newUsers: 52, queries: 1_722, payments: 27 },
  ];
  return base.map((b, i) => {
    const d = subDays(new Date(), 6 - i);
    return {
      date: format(d, "yyyy-MM-dd"),
      label: format(d, "EEE"),
      ...b,
    };
  });
}

export const RANGE_LABELS: Record<RangeKey, string> = {
  today: "Today",
  yesterday: "Yesterday",
  last7: "Last 7 days",
  last30: "Last 30 days",
  thisMonth: "This month",
  lastMonth: "Last month",
  allTime: "All time",
  custom: "Custom",
};
