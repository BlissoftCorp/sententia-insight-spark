import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { CreditCard, LogIn, MessageSquare, UserPlus } from "lucide-react";

import { DateRangeFilter } from "@/components/dashboard/DateRangeFilter";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { getKpis, RANGE_LABELS } from "@/lib/mock-analytics";

const searchSchema = z.object({
  range: fallback(
    z.enum(["today", "yesterday", "last7", "thisMonth", "lastMonth", "custom"]),
    "last7",
  ).default("last7"),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const Route = createFileRoute("/dashboard/summary")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Summary — Sententia Analytics" },
      { name: "description", content: "New users, logins, queries and payments at a glance." },
    ],
  }),
  component: SummaryPage,
});

function SummaryPage() {
  const search = Route.useSearch() as { range: import("@/lib/mock-analytics").RangeKey; from?: string; to?: string };
  const { range, from, to } = search;
  const navigate = useNavigate({ from: "/dashboard/summary" });
  const kpis = getKpis(range, from, to);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Summary</h1>
          <p className="text-sm text-muted-foreground">
            Showing data for{" "}
            <span className="font-medium text-foreground">{RANGE_LABELS[range]}</span>
          </p>
        </div>
        <DateRangeFilter
          range={range}
          from={from}
          to={to}
          onChange={(next) => navigate({ search: () => next })}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="New users" value={kpis.newUsers.value} icon={UserPlus} />
        <KpiCard label="Login users" value={kpis.loginUsers.value} icon={LogIn} />
        <KpiCard label="Queries" value={kpis.queries.value} icon={MessageSquare} />
        <KpiCard
          label="Payments"
          value={kpis.payments.value}
          icon={CreditCard}
          format="currency"
        />
      </div>

      <TrendChart />
    </div>
  );
}
