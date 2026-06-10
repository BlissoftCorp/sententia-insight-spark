import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getAppTimezone, resolveRange } from "./analytics-range";

const rangeSchema = z.object({
  range: z.enum(["today", "yesterday", "last7", "last30", "thisMonth", "lastMonth", "allTime", "custom"]),
  from: z.string().optional(),
  to: z.string().optional(),
  trendRange: z.enum(["last7", "last30"]).default("last7"),
});

type Kpi = { value: number; delta: number | null };

export type SummaryResponse = {
  kpis: {
    newUsers: Kpi;
    activeUsers: Kpi;
    queries: Kpi;
    payments: Kpi | null; // null = N/A (no payments table yet)
  };
  trend: Array<{
    date: string; // yyyy-mm-dd
    label: string;
    newUsers: number;
    queries: number;
    activeUsers: number;
  }>;
  topUsers: Array<{
    id: string;
    name: string | null;
    email: string;
    queries: number;
    tokens: number;
  }>;
  error: string | null;
};

export type UsersListResponse = {
  users: Array<{
    id: string;
    name: string | null;
    email: string;
    queries: number;
    tokens: number;
    lastSession: string | null;
    createdAt: string;
  }>;
  error: string | null;
};

export type UserDetailResponse = {
  user: {
    id: string;
    name: string | null;
    email: string;
    createdAt: string;
    lastSession: string | null;
  } | null;
  series: Array<{ date: string; label: string; queries: number }>;
  payments: Array<{
    operationId: string;
    status: "approved" | "pending";
    price: number;
    tokens: number;
    createdAt: string;
  }>;
  lastPayment: null; // N/A: payments table doesn't exist
  error: string | null;
};

function fmtLabel(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function shiftRange(from: Date, to: Date): { prevFrom: Date; prevTo: Date } {
  const ms = +to - +from;
  return {
    prevFrom: new Date(+from - ms - 1),
    prevTo: new Date(+from - 1),
  };
}

function pctDelta(curr: number, prev: number): number | null {
  if (prev === 0) return curr === 0 ? 0 : null;
  return +(((curr - prev) / prev) * 100).toFixed(1);
}

export const getSummary = createServerFn({ method: "POST" })
  .inputValidator((data: { range: string; from?: string; to?: string }) =>
    rangeSchema.parse(data),
  )
  .handler(async ({ data }): Promise<SummaryResponse> => {
    const empty: SummaryResponse = {
      kpis: {
        newUsers: { value: 0, delta: null },
        activeUsers: { value: 0, delta: null },
        queries: { value: 0, delta: null },
        payments: null,
      },
      trend: [],
      topUsers: [],
      error: null,
    };

    try {
      const { sql } = await import("./db.server");
      const tz = getAppTimezone();
      const { from, to } = resolveRange(data.range as never, data.from, data.to, tz);
      const { prevFrom, prevTo } = shiftRange(from, to);
      const trendRangeKey = data.trendRange ?? "last7";
      const trendRange = resolveRange(trendRangeKey, undefined, undefined, tz);
      const trendFrom = trendRange.from;
      const trendTo = trendRange.to;

      const [
        newUsersCurr,
        newUsersPrev,
        queriesCurr,
        queriesPrev,
        activeCurr,
        activePrev,
        trendRows,
        topUsersRows,
      ] = await Promise.all([
        sql<{ c: string }[]>`SELECT COUNT(*)::text AS c FROM users WHERE created_at BETWEEN ${from} AND ${to}`,
        sql<{ c: string }[]>`SELECT COUNT(*)::text AS c FROM users WHERE created_at BETWEEN ${prevFrom} AND ${prevTo}`,
        sql<{ c: string }[]>`SELECT COUNT(*)::text AS c FROM messages WHERE role='user' AND created_at BETWEEN ${from} AND ${to}`,
        sql<{ c: string }[]>`SELECT COUNT(*)::text AS c FROM messages WHERE role='user' AND created_at BETWEEN ${prevFrom} AND ${prevTo}`,
        sql<{ c: string }[]>`
          SELECT COUNT(DISTINCT c.user_id)::text AS c
          FROM messages m JOIN conversations c ON c.id = m.conversation_id
          WHERE m.role='user' AND m.created_at BETWEEN ${from} AND ${to}
        `,
        sql<{ c: string }[]>`
          SELECT COUNT(DISTINCT c.user_id)::text AS c
          FROM messages m JOIN conversations c ON c.id = m.conversation_id
          WHERE m.role='user' AND m.created_at BETWEEN ${prevFrom} AND ${prevTo}
        `,
        sql<
          { d: Date; new_users: string; queries: string; active_users: string }[]
        >`
          WITH days AS (
            SELECT generate_series(
              date_trunc('day', (${trendFrom}::timestamptz) AT TIME ZONE ${tz}),
              date_trunc('day', (${trendTo}::timestamptz) AT TIME ZONE ${tz}),
              interval '1 day'
            )::date AS d
          )
          SELECT
            days.d AS d,
            COALESCE(nu.c, 0)::text AS new_users,
            COALESCE(q.c, 0)::text AS queries,
            COALESCE(au.c, 0)::text AS active_users
          FROM days
          LEFT JOIN (
            SELECT date_trunc('day', created_at AT TIME ZONE ${tz})::date AS d, COUNT(*) AS c
            FROM users WHERE created_at BETWEEN ${trendFrom} AND ${trendTo}
            GROUP BY 1
          ) nu ON nu.d = days.d
          LEFT JOIN (
            SELECT date_trunc('day', created_at AT TIME ZONE ${tz})::date AS d, COUNT(*) AS c
            FROM messages WHERE role='user' AND created_at BETWEEN ${trendFrom} AND ${trendTo}
            GROUP BY 1
          ) q ON q.d = days.d
          LEFT JOIN (
            SELECT date_trunc('day', m.created_at AT TIME ZONE ${tz})::date AS d, COUNT(DISTINCT c.user_id) AS c
            FROM messages m JOIN conversations c ON c.id = m.conversation_id
            WHERE m.role='user' AND m.created_at BETWEEN ${trendFrom} AND ${trendTo}
            GROUP BY 1
          ) au ON au.d = days.d
          ORDER BY days.d
        `,
        sql<
          { id: string; name: string | null; email: string; queries: string; tokens: string }[]
        >`
          SELECT
            u.id::text AS id,
            COALESCE(NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), ''), u.email) AS name,
            u.email,
            COUNT(m.*)::text AS queries,
            COALESCE(SUM((m.usage->>'total_tokens')::int), 0)::text AS tokens
          FROM users u
          JOIN conversations c ON c.user_id = u.id
          JOIN messages m ON m.conversation_id = c.id
          WHERE m.role='user' AND m.created_at BETWEEN ${from} AND ${to}
          GROUP BY u.id, u.email, u.first_name, u.last_name
          ORDER BY queries DESC NULLS LAST
          LIMIT 5
        `,
      ]);

      const newUsersVal = Number(newUsersCurr[0]?.c ?? 0);
      const newUsersPrevVal = Number(newUsersPrev[0]?.c ?? 0);
      const queriesVal = Number(queriesCurr[0]?.c ?? 0);
      const queriesPrevVal = Number(queriesPrev[0]?.c ?? 0);
      const activeVal = Number(activeCurr[0]?.c ?? 0);
      const activePrevVal = Number(activePrev[0]?.c ?? 0);

      return {
        kpis: {
          newUsers: { value: newUsersVal, delta: pctDelta(newUsersVal, newUsersPrevVal) },
          activeUsers: { value: activeVal, delta: pctDelta(activeVal, activePrevVal) },
          queries: { value: queriesVal, delta: pctDelta(queriesVal, queriesPrevVal) },
          payments: null,
        },
        trend: trendRows.map((r) => {
          const d = new Date(r.d);
          return {
            date: d.toISOString().slice(0, 10),
            label: fmtLabel(d),
            newUsers: Number(r.new_users),
            queries: Number(r.queries),
            activeUsers: Number(r.active_users),
          };
        }),
        topUsers: topUsersRows.map((r) => ({
          id: r.id,
          name: r.name,
          email: r.email,
          queries: Number(r.queries),
          tokens: Number(r.tokens),
        })),
        error: null,
      };
    } catch (e) {
      console.error("getSummary failed:", e);
      return { ...empty, error: (e as Error).message };
    }
  });

export const getUsersList = createServerFn({ method: "GET" }).handler(
  async (): Promise<UsersListResponse> => {
    try {
      const { sql } = await import("./db.server");
      const rows = await sql<
        {
          id: string;
          name: string | null;
          email: string;
          queries: string;
          tokens: string;
          last_session: Date | null;
          created_at: Date;
        }[]
      >`
        SELECT
          u.id::text AS id,
          COALESCE(NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), ''), u.email) AS name,
          u.email,
          COALESCE(stats.queries, 0)::text AS queries,
          COALESCE(stats.tokens, 0)::text AS tokens,
          stats.last_session,
          u.created_at
        FROM users u
        LEFT JOIN (
          SELECT
            c.user_id,
            COUNT(m.*) FILTER (WHERE m.role='user') AS queries,
            COALESCE(SUM((m.usage->>'total_tokens')::int) FILTER (WHERE m.role='user'), 0) AS tokens,
            MAX(m.created_at) AS last_session
          FROM conversations c
          LEFT JOIN messages m ON m.conversation_id = c.id
          GROUP BY c.user_id
        ) stats ON stats.user_id = u.id
        ORDER BY u.created_at DESC
      `;

      return {
        users: rows.map((r) => ({
          id: r.id,
          name: r.name,
          email: r.email,
          queries: Number(r.queries),
          tokens: Number(r.tokens),
          lastSession: r.last_session ? new Date(r.last_session).toISOString() : null,
          createdAt: new Date(r.created_at).toISOString(),
        })),
        error: null,
      };
    } catch (e) {
      console.error("getUsersList failed:", e);
      return { users: [], error: (e as Error).message };
    }
  },
);

const userDetailInput = z.object({
  userId: z.string().min(1),
  days: z.number().int().min(1).max(365).default(30),
});

export const getUserDetail = createServerFn({ method: "POST" })
  .inputValidator((data: { userId: string; days?: number }) =>
    userDetailInput.parse(data),
  )
  .handler(async ({ data }): Promise<UserDetailResponse> => {
    try {
      const { sql } = await import("./db.server");
      const tz = getAppTimezone();
      // Anchor "today" to the configured app timezone, then go back N-1 days.
      const todayRange = resolveRange("today", undefined, undefined, tz);
      const to = todayRange.to;
      const from = new Date(
        todayRange.from.getTime() - (data.days - 1) * 86_400_000,
      );

      const [userRow, lastSession, seriesRows] = await Promise.all([
        sql<{ id: string; name: string | null; email: string; created_at: Date }[]>`
          SELECT
            u.id::text AS id,
            COALESCE(NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), ''), u.email) AS name,
            u.email,
            u.created_at
          FROM users u WHERE u.id::text = ${data.userId} LIMIT 1
        `,
        sql<{ last: Date | null }[]>`
          SELECT MAX(m.created_at) AS last
          FROM messages m JOIN conversations c ON c.id = m.conversation_id
          WHERE c.user_id::text = ${data.userId}
        `,
        sql<{ d: Date; c: string }[]>`
          WITH days AS (
            SELECT generate_series(
              date_trunc('day', (${from}::timestamptz) AT TIME ZONE ${tz}),
              date_trunc('day', (${to}::timestamptz) AT TIME ZONE ${tz}),
              interval '1 day'
            )::date AS d
          )
          SELECT days.d AS d, COALESCE(q.c, 0)::text AS c
          FROM days
          LEFT JOIN (
            SELECT date_trunc('day', m.created_at AT TIME ZONE ${tz})::date AS d, COUNT(*) AS c
            FROM messages m JOIN conversations c ON c.id = m.conversation_id
            WHERE m.role='user' AND c.user_id::text = ${data.userId}
              AND m.created_at BETWEEN ${from} AND ${to}
            GROUP BY 1
          ) q ON q.d = days.d
          ORDER BY days.d
        `,
      ]);

      if (!userRow[0]) {
        return {
          user: null,
          series: [],
          payments: [],
          lastPayment: null,
          error: null,
        };
      }

      return {
        user: {
          id: userRow[0].id,
          name: userRow[0].name,
          email: userRow[0].email,
          createdAt: new Date(userRow[0].created_at).toISOString(),
          lastSession: lastSession[0]?.last
            ? new Date(lastSession[0].last).toISOString()
            : null,
        },
        series: seriesRows.map((r) => {
          const d = new Date(r.d);
          return {
            date: d.toISOString().slice(0, 10),
            label: fmtLabel(d),
            queries: Number(r.c),
          };
        }),
        payments: [], // N/A: no payments table
        lastPayment: null,
        error: null,
      };
    } catch (e) {
      console.error("getUserDetail failed:", e);
      return {
        user: null,
        series: [],
        payments: [],
        lastPayment: null,
        error: (e as Error).message,
      };
    }
  });

export type TrackingResponse = {
  totalUsers: number;
  zeroQueries: number;
  atLeastOne: number;
  oneToFive: number;
  moreThanFive: number;
  signupOnlyNoQueries: number;
  signupOnlyWithQueries: number;
  returnedDifferentDay: number;
  error: string | null;
};

export const getTracking = createServerFn({ method: "GET" }).handler(
  async (): Promise<TrackingResponse> => {
    const empty: TrackingResponse = {
      totalUsers: 0,
      zeroQueries: 0,
      atLeastOne: 0,
      oneToFive: 0,
      moreThanFive: 0,
      signupOnlyNoQueries: 0,
      signupOnlyWithQueries: 0,
      returnedDifferentDay: 0,
      error: null,
    };
    try {
      const { sql } = await import("./db.server");
      const tz = getAppTimezone();
      const rows = await sql<
        {
          total_users: string;
          zero_queries: string;
          at_least_one: string;
          one_to_five: string;
          more_than_five: string;
          signup_only_no_queries: string;
          signup_only_with_queries: string;
          returned_different_day: string;
        }[]
      >`
        WITH user_stats AS (
          SELECT
            u.id,
            u.created_at,
            COALESCE(COUNT(m.*) FILTER (WHERE m.role = 'user'), 0) AS queries,
            MAX(m.created_at) FILTER (WHERE m.role = 'user') AS last_query_at,
            COUNT(DISTINCT (m.created_at AT TIME ZONE ${tz})::date)
              FILTER (WHERE m.role = 'user'
                AND (m.created_at AT TIME ZONE ${tz})::date
                  <> (u.created_at AT TIME ZONE ${tz})::date) AS other_day_count
          FROM users u
          LEFT JOIN conversations c ON c.user_id = u.id
          LEFT JOIN messages m ON m.conversation_id = c.id
          GROUP BY u.id, u.created_at
        )
        SELECT
          COUNT(*)::text AS total_users,
          COUNT(*) FILTER (WHERE queries = 0)::text AS zero_queries,
          COUNT(*) FILTER (WHERE queries >= 1)::text AS at_least_one,
          COUNT(*) FILTER (WHERE queries BETWEEN 1 AND 5)::text AS one_to_five,
          COUNT(*) FILTER (WHERE queries > 5)::text AS more_than_five,
          COUNT(*) FILTER (WHERE queries = 0)::text AS signup_only_no_queries,
          COUNT(*) FILTER (
            WHERE queries >= 1
              AND (last_query_at AT TIME ZONE ${tz})::date
                = (created_at AT TIME ZONE ${tz})::date
          )::text AS signup_only_with_queries,
          COUNT(*) FILTER (WHERE other_day_count > 0)::text AS returned_different_day
        FROM user_stats
      `;
      const r = rows[0];
      return {
        totalUsers: Number(r?.total_users ?? 0),
        zeroQueries: Number(r?.zero_queries ?? 0),
        atLeastOne: Number(r?.at_least_one ?? 0),
        oneToFive: Number(r?.one_to_five ?? 0),
        moreThanFive: Number(r?.more_than_five ?? 0),
        signupOnlyNoQueries: Number(r?.signup_only_no_queries ?? 0),
        signupOnlyWithQueries: Number(r?.signup_only_with_queries ?? 0),
        returnedDifferentDay: Number(r?.returned_different_day ?? 0),
        error: null,
      };
    } catch (e) {
      console.error("getTracking failed:", e);
      return { ...empty, error: (e as Error).message };
    }
  },
);
