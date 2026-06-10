import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { Suspense } from "react";
import { Activity, CreditCard, Loader2, MessageSquare, UserPlus } from "lucide-react";

import { DateRangeFilter } from "@/components/dashboard/DateRangeFilter";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { TopUsersCard } from "@/components/dashboard/TopUsersCard";
import { TrendChart, type TrendRange } from "@/components/dashboard/TrendChart";
import { DataErrorBanner } from "@/components/dashboard/DataErrorBanner";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getSummary } from "@/lib/analytics.functions";
import { RANGE_LABELS, type RangeKey } from "@/lib/mock-analytics";

const searchSchema = z.object({
  range: fallback(
    z.enum(["today", "yesterday", "last7", "thisMonth", "lastMonth", "custom"]),
    "today",
  ).default("today"),
  from: z.string().optional(),
  to: z.string().optional(),
  trendRange: fallback(z.enum(["last7", "last30"]), "last7").default("last7"),
});

const summaryQuery = (range: RangeKey, from?: string, to?: string, trendRange?: TrendRange) =>
  queryOptions({
    queryKey: ["summary", range, from ?? null, to ?? null, trendRange ?? "last7"],
    queryFn: () => getSummary({ data: { range, from, to, trendRange } }),
    staleTime: 30_000,
  });

export const Route = createFileRoute("/dashboard/summary")({
  validateSearch: zodValidator(searchSchema),
  loaderDeps: ({ search: { range, from, to } }) => ({ range, from, to }),
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(summaryQuery(deps.range, deps.from, deps.to)),
  head: () => ({
    meta: [
      { title: "Summary — Sententia Analytics" },
      { name: "description", content: "New users, active users, queries and payments at a glance." },
    ],
  }),
  component: SummaryPage,
});

function SummaryPage() {
  const search = Route.useSearch() as { range: RangeKey; from?: string; to?: string };
  const navigate = useNavigate({ from: "/dashboard/summary" });

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Summary</h1>
          <p className="text-sm text-muted-foreground">
            Showing data for{" "}
            <span className="font-medium text-foreground">{RANGE_LABELS[search.range]}</span>
          </p>
        </div>
        <DateRangeFilter
          range={search.range}
          from={search.from}
          to={search.to}
          onChange={(next) => navigate({ search: () => next })}
        />
      </div>

      <Suspense fallback={<SummarySkeleton />}>
        <SummaryContent range={search.range} from={search.from} to={search.to} />
      </Suspense>
    </div>
  );
}

function SummaryContent({
  range,
  from,
  to,
}: {
  range: RangeKey;
  from?: string;
  to?: string;
}) {
  const { data } = useSuspenseQuery(summaryQuery(range, from, to));

  return (
    <>
      {data.error && <DataErrorBanner message={data.error} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="New users"
          value={data.kpis.newUsers.value}
          delta={data.kpis.newUsers.delta}
          icon={UserPlus}
        />
        <KpiCard
          label="Active users"
          value={data.kpis.activeUsers.value}
          delta={data.kpis.activeUsers.delta}
          icon={Activity}
        />
        <KpiCard
          label="Queries"
          value={data.kpis.queries.value}
          delta={data.kpis.queries.delta}
          icon={MessageSquare}
        />
        <KpiCard
          label="Payments"
          value={data.kpis.payments?.value ?? null}
          delta={data.kpis.payments?.delta}
          icon={CreditCard}
        />
      </div>

      <TrendChart data={data.trend} />
      <TopUsersCard users={data.topUsers} />
    </>
  );
}

function SummarySkeleton() {
  return (
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
  );
}
