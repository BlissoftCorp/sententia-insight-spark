import { MOCK_USERS, type UserRow } from "./mock-users";

// Tiny deterministic PRNG (mulberry32) seeded from a string
function hashString(s: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type QueriesPoint = {
  date: string; // ISO date (yyyy-MM-dd)
  label: string; // short label
  queries: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function getUserQueriesSeries(userId: string, days: number): QueriesPoint[] {
  const user = MOCK_USERS.find((u) => u.id === userId);
  const rand = mulberry32(hashString(userId + ":queries"));
  const avg = Math.max(1, Math.round((user?.queries ?? 20) / 30));
  const end = new Date();
  end.setHours(0, 0, 0, 0);

  const points: QueriesPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end.getTime() - i * DAY_MS);
    const noise = rand();
    // active users get more, occasional spikes
    const base = avg + Math.floor(noise * avg * 2);
    const spike = noise > 0.92 ? Math.floor(avg * 3 * rand()) : 0;
    const value = (user?.queries ?? 0) === 0 ? 0 : Math.max(0, base + spike);
    points.push({
      date: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      queries: value,
    });
  }
  return points;
}

export type PaymentRow = {
  operationId: string;
  status: "approved" | "pending";
  price: number; // USD
  tokens: number;
  createdAt: string; // ISO
};

const PACKAGES: { price: number; tokens: number }[] = [
  { price: 5, tokens: 25_000 },
  { price: 10, tokens: 55_000 },
  { price: 20, tokens: 120_000 },
  { price: 50, tokens: 320_000 },
  { price: 100, tokens: 700_000 },
];

export function getUserPayments(userId: string): PaymentRow[] {
  const user = MOCK_USERS.find((u) => u.id === userId);
  if (!user || user.tokens === 0) return [];

  const rand = mulberry32(hashString(userId + ":payments"));
  // Number of payments roughly proportional to tokens
  const count = Math.min(
    12,
    Math.max(1, Math.round(user.tokens / 80_000) + Math.floor(rand() * 3)),
  );

  const created = new Date(user.createdAt).getTime();
  const last = new Date(user.lastSession).getTime();
  const span = Math.max(DAY_MS, last - created);

  const rows: PaymentRow[] = [];
  for (let i = 0; i < count; i++) {
    const pkg = PACKAGES[Math.floor(rand() * PACKAGES.length)];
    const t = created + rand() * span;
    const isPending = rand() > 0.88;
    const opNum = Math.floor(rand() * 9_000_000) + 1_000_000;
    rows.push({
      operationId: `OP-${opNum}`,
      status: isPending ? "pending" : "approved",
      price: pkg.price,
      tokens: pkg.tokens,
      createdAt: new Date(t).toISOString(),
    });
  }
  rows.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  return rows;
}

export function getUserLastPayment(userId: string): PaymentRow | null {
  const payments = getUserPayments(userId);
  const approved = payments.find((p) => p.status === "approved");
  return approved ?? payments[0] ?? null;
}

export function findUser(userId: string): UserRow | undefined {
  return MOCK_USERS.find((u) => u.id === userId);
}
