import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { Activity, CreditCard, Loader2, MessageSquare, UserPlus } from "lucide-react";

import { DateRangeFilter } from "@/components/dashboard/DateRangeFilter";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { TopUsersCard } from "@/components/dashboard/TopUsersCard";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getKpis, RANGE_LABELS } from "@/lib/mock-analytics";

const searchSchema = z.object({
  range: fallback(
    z.enum(["today", "yesterday", "last7", "thisMonth", "lastMonth", "custom"]),
    "today",
  ).default("today"),
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

  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 450);
    return () => clearTimeout(t);
  }, [range, from, to]);

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

      {loading ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="p-5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="mt-3 h-8 w-32" />
              </Card>
            ))}
          </div>
          <Card className="flex h-[260px] items-center justify-center p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading data…
            </div>
          </Card>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="New users" value={kpis.newUsers.value} icon={UserPlus} />
            <KpiCard label="Active users" value={kpis.activeUsers.value} icon={Activity} />
            <KpiCard label="Queries" value={kpis.queries.value} icon={MessageSquare} />
            <KpiCard label="Payments" value={kpis.payments.value} icon={CreditCard} />
          </div>

          <TrendChart />
          <TopUsersCard />
        </>
      )}
    </div>
  );
}
