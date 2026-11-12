import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getAppTimezone, resolveRange } from "./analytics-range";
import { withDataTimeout } from "./data-timeout";
import { getExcludedEmails } from "./excluded-users";

const rangeFields = {
  range: z
    .enum(["today", "yesterday", "last7", "last30", "thisMonth", "lastMonth", "allTime", "custom"])
    .default("allTime"),
  from: z.string().optional(),
  to: z.string().optional(),
};

const MONTHS_ES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return `${MONTHS_ES[m - 1]} ${y}`;
}

/** "YYYY-MM" of `instant` as observed in `tz`. */
function ymInTz(instant: Date, tz: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(instant);
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  return `${y}-${m}`;
}

function monthsBetween(start: string, end: string): string[] {
  const out: string[] = [];
  let [y, m] = start.split("-").map(Number);
  const [ey, em] = end.split("-").map(Number);
  while (y < ey || (y === ey && m <= em)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Activación
// ---------------------------------------------------------------------------

const activationInput = z.object({
  ...rangeFields,
  granularity: z.enum(["week", "month"]).default("week"),
});

export type ActivationResponse = {
  kpis: {
    signups: number;
    activated: number;
    activationRate: number; // 0-100
    medianMinutes: number | null;
  };
  periods: Array<{
    period: string; // ISO date of period start (Bogota)
    signups: number;
    activated: number;
    rate: number; // 0-100
    medianMinutes: number | null;
  }>;
  distribution: Array<{ key: string; label: string; count: number; pct: number }>;
  error: string | null;
};

export const getActivation = createServerFn({ method: "POST" })
  .inputValidator((data: { range?: string; from?: string; to?: string; granularity?: string }) =>
    activationInput.parse(data),
  )
  .handler(async ({ data }): Promise<ActivationResponse> => {
    const empty: ActivationResponse = {
      kpis: { signups: 0, activated: 0, activationRate: 0, medianMinutes: null },
      periods: [],
      distribution: [],
      error: null,
    };
    try {
      return await withDataTimeout(async () => {
        const { sql } = await import("./db.server");
        const tz = getAppTimezone();
        const excluded = getExcludedEmails();
        const { from, to } = resolveRange(data.range, data.from, data.to, tz);

        // Per-user: registration date + first query ever (query = message with role 'user').
        const userStats = sql`
          WITH user_stats AS (
            SELECT
              u.id,
              u.created_at,
              MIN(m.created_at) FILTER (WHERE m.role = 'user') AS first_query_at
            FROM users u
            LEFT JOIN conversations c ON c.user_id = u.id
            LEFT JOIN messages m ON m.conversation_id = c.id
            WHERE u.created_at BETWEEN ${from} AND ${to}
              AND NOT (u.email = ANY(${excluded}))
            GROUP BY u.id, u.created_at
          )
        `;

        const [kpiRows, periodRows] = await Promise.all([
          sql<
            {
              signups: string;
              activated: string;
              median_minutes: number | null;
              b_lt5: string;
              b_5_60: string;
              b_1_24h: string;
              b_1_7d: string;
              b_gt7d: string;
            }[]
          >`
            ${userStats}
            SELECT
              COUNT(*)::text AS signups,
              COUNT(*) FILTER (WHERE first_query_at IS NOT NULL)::text AS activated,
              percentile_cont(0.5) WITHIN GROUP (
                ORDER BY EXTRACT(EPOCH FROM (first_query_at - created_at)) / 60.0
              ) FILTER (WHERE first_query_at IS NOT NULL) AS median_minutes,
              COUNT(*) FILTER (WHERE first_query_at IS NOT NULL
                AND EXTRACT(EPOCH FROM (first_query_at - created_at)) / 60.0 < 5)::text AS b_lt5,
              COUNT(*) FILTER (WHERE first_query_at IS NOT NULL
                AND EXTRACT(EPOCH FROM (first_query_at - created_at)) / 60.0 >= 5
                AND EXTRACT(EPOCH FROM (first_query_at - created_at)) / 60.0 < 60)::text AS b_5_60,
              COUNT(*) FILTER (WHERE first_query_at IS NOT NULL
                AND EXTRACT(EPOCH FROM (first_query_at - created_at)) / 60.0 >= 60
                AND EXTRACT(EPOCH FROM (first_query_at - created_at)) / 60.0 < 1440)::text AS b_1_24h,
              COUNT(*) FILTER (WHERE first_query_at IS NOT NULL
                AND EXTRACT(EPOCH FROM (first_query_at - created_at)) / 60.0 >= 1440
                AND EXTRACT(EPOCH FROM (first_query_at - created_at)) / 60.0 < 10080)::text AS b_1_7d,
              COUNT(*) FILTER (WHERE first_query_at IS NOT NULL
                AND EXTRACT(EPOCH FROM (first_query_at - created_at)) / 60.0 >= 10080)::text AS b_gt7d
            FROM user_stats
          `,
          sql<
            {
              period: Date;
              signups: string;
              activated: string;
              median_minutes: number | null;
            }[]
          >`
            ${userStats}
            SELECT
              date_trunc(
                CASE WHEN ${data.granularity} = 'month' THEN 'month' ELSE 'week' END,
                created_at AT TIME ZONE ${tz}
              ) AS period,
              COUNT(*)::text AS signups,
              COUNT(*) FILTER (WHERE first_query_at IS NOT NULL)::text AS activated,
              percentile_cont(0.5) WITHIN GROUP (
                ORDER BY EXTRACT(EPOCH FROM (first_query_at - created_at)) / 60.0
              ) FILTER (WHERE first_query_at IS NOT NULL) AS median_minutes
            FROM user_stats
            GROUP BY 1
            ORDER BY 1
          `,
        ]);

        const k = kpiRows[0];
        const signups = Number(k?.signups ?? 0);
        const activated = Number(k?.activated ?? 0);

        const buckets = [
          { key: "lt5", label: "Menos de 5 min", count: Number(k?.b_lt5 ?? 0) },
          { key: "5_60", label: "5 a 60 min", count: Number(k?.b_5_60 ?? 0) },
          { key: "1_24h", label: "1 a 24 horas", count: Number(k?.b_1_24h ?? 0) },
          { key: "1_7d", label: "1 a 7 días", count: Number(k?.b_1_7d ?? 0) },
          { key: "gt7d", label: "Más de 7 días", count: Number(k?.b_gt7d ?? 0) },
        ];

        return {
          kpis: {
            signups,
            activated,
            activationRate: signups === 0 ? 0 : +((activated / signups) * 100).toFixed(1),
            medianMinutes:
              k?.median_minutes === null || k?.median_minutes === undefined
                ? null
                : +Number(k.median_minutes).toFixed(1),
          },
          periods: periodRows.map((r) => {
            const s = Number(r.signups);
            const a = Number(r.activated);
            return {
              period: new Date(r.period).toISOString(),
              signups: s,
              activated: a,
              rate: s === 0 ? 0 : +((a / s) * 100).toFixed(1),
              medianMinutes:
                r.median_minutes === null || r.median_minutes === undefined
                  ? null
                  : +Number(r.median_minutes).toFixed(1),
            };
          }),
          distribution: buckets.map((b) => ({
            ...b,
            pct: activated === 0 ? 0 : +((b.count / activated) * 100).toFixed(1),
          })),
          error: null,
        };
      });
    } catch (e) {
      console.error("getActivation failed:", e);
      return {
        ...empty,
        error: e instanceof Error ? e.message : "No se pudieron cargar los datos de Sententia.",
      };
    }
  });

// ---------------------------------------------------------------------------
// Retención
// ---------------------------------------------------------------------------

const retentionInput = z.object({
  ...rangeFields,
  status: z.enum(["all", "active", "inactive", "never"]).default("all"),
});

export type RetentionStatus = "all" | "active" | "inactive" | "never";

export type RetentionResponse = {
  totalUsers: number; // after status filter
  activity: {
    zero: number;
    atLeastOne: number;
    one: number;
    twoToThree: number;
    fourToTen: number;
    moreThanTen: number;
  };
  statusCounts: { active: number; inactive: number; neverActivated: number; total: number };
  postReg: {
    signupOnlyNoQueries: number;
    signupOnlyWithQueries: number;
    returnedDifferentDay: number;
  };
  monthly: Array<{
    month: string; // YYYY-MM
    label: string;
    newUsers: number;
    recurring: number;
    active: number;
    queries: number;
  }>;
  retention: Array<{ month: string; label: string; rate: number | null }>;
  cohort: {
    columns: number[]; // month offsets 0..N
    rows: Array<{
      month: string;
      label: string;
      size: number;
      values: Array<number | null>; // % active, null = month hasn't happened
    }>;
  };
  userCohort: {
    months: Array<{ key: string; label: string }>;
    users: Array<{
      id: string;
      email: string;
      name: string | null;
      createdMonth: string;
      counts: number[];
      total: number;
    }>;
    monthTotals: number[];
    grandTotal: number;
  };
  error: string | null;
};

export const getRetention = createServerFn({ method: "POST" })
  .inputValidator((data: { range?: string; from?: string; to?: string; status?: string }) =>
    retentionInput.parse(data),
  )
  .handler(async ({ data }): Promise<RetentionResponse> => {
    const empty: RetentionResponse = {
      totalUsers: 0,
      activity: { zero: 0, atLeastOne: 0, one: 0, twoToThree: 0, fourToTen: 0, moreThanTen: 0 },
      statusCounts: { active: 0, inactive: 0, neverActivated: 0, total: 0 },
      postReg: { signupOnlyNoQueries: 0, signupOnlyWithQueries: 0, returnedDifferentDay: 0 },
      monthly: [],
      retention: [],
      cohort: { columns: [], rows: [] },
      userCohort: { months: [], users: [], monthTotals: [], grandTotal: 0 },
      error: null,
    };
    try {
      return await withDataTimeout(async () => {
        const { sql } = await import("./db.server");
        const tz = getAppTimezone();
        const excluded = getExcludedEmails();
        const { from, to } = resolveRange(data.range, data.from, data.to, tz);
        const status = data.status;

        const userStats = sql`
          WITH user_stats AS (
            SELECT
              u.id,
              u.email,
              COALESCE(NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), ''), u.email) AS name,
              u.created_at,
              COALESCE(COUNT(m.id) FILTER (WHERE m.role = 'user'), 0) AS queries,
              MIN(m.created_at) FILTER (WHERE m.role = 'user') AS first_query_at,
              MAX(m.created_at) FILTER (WHERE m.role = 'user') AS last_query_at,
              COUNT(DISTINCT (m.created_at AT TIME ZONE ${tz})::date)
                FILTER (WHERE m.role = 'user'
                  AND (m.created_at AT TIME ZONE ${tz})::date
                    <> (u.created_at AT TIME ZONE ${tz})::date) AS other_day_count
            FROM users u
            LEFT JOIN conversations c ON c.user_id = u.id
            LEFT JOIN messages m ON m.conversation_id = c.id
            WHERE u.created_at BETWEEN ${from} AND ${to}
              AND NOT (u.email = ANY(${excluded}))
            GROUP BY u.id, u.email, u.first_name, u.last_name, u.created_at
          )
        `;

        // Activo = consultó en los últimos 30 días; Inactivo = consultó alguna vez pero no
        // en los últimos 30 días; Nunca activado = sin consultas.
        const statusCond = sql`
          AND (
            ${status} = 'all'
            OR (${status} = 'active' AND last_query_at >= now() - interval '30 days')
            OR (${status} = 'inactive' AND queries > 0 AND last_query_at < now() - interval '30 days')
            OR (${status} = 'never' AND queries = 0)
          )
        `;

        const [activityRows, statusRows, userMonthRows] = await Promise.all([
          // Activity cards — respect the status filter.
          sql<
            {
              total: string;
              zero: string;
              at_least_one: string;
              one: string;
              two_to_three: string;
              four_to_ten: string;
              more_than_ten: string;
            }[]
          >`
            ${userStats}
            SELECT
              COUNT(*)::text AS total,
              COUNT(*) FILTER (WHERE queries = 0)::text AS zero,
              COUNT(*) FILTER (WHERE queries >= 1)::text AS at_least_one,
              COUNT(*) FILTER (WHERE queries = 1)::text AS one,
              COUNT(*) FILTER (WHERE queries BETWEEN 2 AND 3)::text AS two_to_three,
              COUNT(*) FILTER (WHERE queries BETWEEN 4 AND 10)::text AS four_to_ten,
              COUNT(*) FILTER (WHERE queries > 10)::text AS more_than_ten
            FROM user_stats
            WHERE true ${statusCond}
          `,
          // Status cards + post-registration retention — always over the full range.
          sql<
            {
              total: string;
              active: string;
              inactive: string;
              never_activated: string;
              signup_only_no_queries: string;
              signup_only_with_queries: string;
              returned_different_day: string;
            }[]
          >`
            ${userStats}
            SELECT
              COUNT(*)::text AS total,
              COUNT(*) FILTER (WHERE last_query_at >= now() - interval '30 days')::text AS active,
              COUNT(*) FILTER (WHERE queries > 0 AND last_query_at < now() - interval '30 days')::text AS inactive,
              COUNT(*) FILTER (WHERE queries = 0)::text AS never_activated,
              COUNT(*) FILTER (WHERE queries = 0)::text AS signup_only_no_queries,
              COUNT(*) FILTER (
                WHERE queries >= 1
                  AND (last_query_at AT TIME ZONE ${tz})::date
                    = (created_at AT TIME ZONE ${tz})::date
              )::text AS signup_only_with_queries,
              COUNT(*) FILTER (WHERE other_day_count > 0)::text AS returned_different_day
            FROM user_stats
          `,
          // Per-user per-month query counts — respect the status filter.
          sql<
            {
              id: string;
              email: string;
              name: string | null;
              created_at: Date;
              month: Date | null;
              c: string;
            }[]
          >`
            ${userStats}
            SELECT
              us.id::text AS id,
              us.email,
              us.name,
              us.created_at,
              (date_trunc('month', m.created_at AT TIME ZONE ${tz}))::date AS month,
              COUNT(m.id) FILTER (WHERE m.role = 'user')::text AS c
            FROM user_stats us
            LEFT JOIN conversations c ON c.user_id = us.id
            LEFT JOIN messages m ON m.conversation_id = c.id
            WHERE true ${statusCond}
            GROUP BY us.id, us.email, us.name, us.created_at, month
          `,
        ]);

        const a = activityRows[0];
        const s = statusRows[0];

        // ---- Assemble per-user monthly counts ----
        type UserAgg = {
          id: string;
          email: string;
          name: string | null;
          createdAt: Date;
          byMonth: Map<string, number>;
        };
        const usersMap = new Map<string, UserAgg>();
        for (const r of userMonthRows) {
          let u = usersMap.get(r.id);
          if (!u) {
            u = {
              id: r.id,
              email: r.email,
              name: r.name,
              createdAt: new Date(r.created_at),
              byMonth: new Map(),
            };
            usersMap.set(r.id, u);
          }
          if (r.month) {
            const ym = new Date(r.month).toISOString().slice(0, 7);
            u.byMonth.set(ym, (u.byMonth.get(ym) ?? 0) + Number(r.c));
          }
        }

        const users = Array.from(usersMap.values());
        const currentYm = ymInTz(new Date(), tz);
        let minYm = currentYm;
        for (const u of users) {
          const ym = ymInTz(u.createdAt, tz);
          if (ym < minYm) minYm = ym;
        }
        const months = users.length === 0 ? [] : monthsBetween(minYm, currentYm);
        const monthIndex = new Map(months.map((m, i) => [m, i]));

        const userRows = users.map((u) => {
          const counts = months.map((m) => u.byMonth.get(m) ?? 0);
          const total = counts.reduce((acc, n) => acc + n, 0);
          return {
            id: u.id,
            email: u.email,
            name: u.name,
            createdMonth: ymInTz(u.createdAt, tz),
            counts,
            total,
          };
        });

        const monthTotals = months.map((_, i) =>
          userRows.reduce((acc, u) => acc + u.counts[i], 0),
        );
        const grandTotal = monthTotals.reduce((acc, n) => acc + n, 0);

        // ---- Monthly active (new vs recurring) ----
        const firstActiveIdx = userRows.map((u) => u.counts.findIndex((c) => c > 0));
        const monthly = months.map((m, i) => {
          let active = 0;
          let newUsers = 0;
          for (let ui = 0; ui < userRows.length; ui++) {
            if (userRows[ui].counts[i] > 0) {
              active += 1;
              if (firstActiveIdx[ui] === i) newUsers += 1;
            }
          }
          return {
            month: m,
            label: monthLabel(m),
            newUsers,
            recurring: active - newUsers,
            active,
            queries: monthTotals[i],
          };
        });

        // ---- Monthly retention: % of previous month's actives also active this month ----
        const activeSets = months.map(
          (_, i) => new Set(userRows.filter((u) => u.counts[i] > 0).map((u) => u.id)),
        );
        const retention = months.map((m, i) => {
          if (i === 0) return { month: m, label: monthLabel(m), rate: null };
          const prev = activeSets[i - 1];
          if (prev.size === 0) return { month: m, label: monthLabel(m), rate: null };
          let kept = 0;
          for (const id of activeSets[i]) if (prev.has(id)) kept += 1;
          return { month: m, label: monthLabel(m), rate: +((kept / prev.size) * 100).toFixed(1) };
        });

        // ---- Aggregate cohort heatmap (rows = registration month) ----
        const cohortRows: RetentionResponse["cohort"]["rows"] = [];
        months.forEach((cohortYm, ci) => {
          const members = userRows.filter((u) => u.createdMonth === cohortYm);
          if (members.length === 0) return;
          const values: Array<number | null> = [];
          for (let offset = 0; ci + offset < months.length; offset++) {
            const active = members.filter((u) => u.counts[ci + offset] > 0).length;
            values.push(+((active / members.length) * 100).toFixed(1));
          }
          cohortRows.push({
            month: cohortYm,
            label: monthLabel(cohortYm),
            size: members.length,
            values,
          });
        });
        const maxOffsets = months.length === 0 ? 0 : months.length - (monthIndex.get(minYm) ?? 0);

        return {
          totalUsers: Number(a?.total ?? 0),
          activity: {
            zero: Number(a?.zero ?? 0),
            atLeastOne: Number(a?.at_least_one ?? 0),
            one: Number(a?.one ?? 0),
            twoToThree: Number(a?.two_to_three ?? 0),
            fourToTen: Number(a?.four_to_ten ?? 0),
            moreThanTen: Number(a?.more_than_ten ?? 0),
          },
          statusCounts: {
            active: Number(s?.active ?? 0),
            inactive: Number(s?.inactive ?? 0),
            neverActivated: Number(s?.never_activated ?? 0),
            total: Number(s?.total ?? 0),
          },
          postReg: {
            signupOnlyNoQueries: Number(s?.signup_only_no_queries ?? 0),
            signupOnlyWithQueries: Number(s?.signup_only_with_queries ?? 0),
            returnedDifferentDay: Number(s?.returned_different_day ?? 0),
          },
          monthly,
          retention,
          cohort: {
            columns: Array.from({ length: maxOffsets }, (_, i) => i),
            rows: cohortRows,
          },
          userCohort: {
            months: months.map((m) => ({ key: m, label: monthLabel(m) })),
            users: userRows,
            monthTotals,
            grandTotal,
          },
          error: null,
        };
      });
    } catch (e) {
      console.error("getRetention failed:", e);
      return {
        ...empty,
        error: e instanceof Error ? e.message : "No se pudieron cargar los datos de Sententia.",
      };
    }
  });
