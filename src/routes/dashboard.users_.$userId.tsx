import { Suspense, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, Loader2 } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataErrorBanner } from "@/components/dashboard/DataErrorBanner";
import { getUserDetail } from "@/lib/analytics.functions";

const userQuery = (userId: string, days: number) =>
  queryOptions({
    queryKey: ["user-detail", userId, days],
    queryFn: () => getUserDetail({ data: { userId, days } }),
    staleTime: 30_000,
  });

export const Route = createFileRoute("/dashboard/users_/$userId")({
  loader: ({ params, context }) =>
    context.queryClient.ensureQueryData(userQuery(params.userId, 30)),
  head: () => ({
    meta: [{ title: "User — Sententia Analytics" }],
  }),
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl py-16 text-center">
      <h1 className="text-2xl font-semibold">User not found</h1>
      <Button asChild className="mt-6">
        <Link to="/dashboard/users">Back to users</Link>
      </Button>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-2xl py-16 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-muted-foreground">{error.message}</p>
    </div>
  ),
  component: UserDetailPage,
});

const fmtNumber = new Intl.NumberFormat("en-US");

function fmtDateTime(iso: string | null) {
  if (!iso) return "—";
  return format(new Date(iso), "d/M/yyyy HH:mm:ss");
}

const RANGES = [
  { value: 7, label: "7d" },
  { value: 30, label: "30d" },
  { value: 90, label: "90d" },
] as const;

function UserDetailPage() {
  const { userId } = Route.useParams();
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/dashboard/users">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Users
          </Link>
        </Button>
      </div>
      <Suspense fallback={<DetailSkeleton />}>
        <UserDetailContent userId={userId} />
      </Suspense>
    </div>
  );
}

function UserDetailContent({ userId }: { userId: string }) {
  const [days, setDays] = useState<number>(30);
  const { data } = useSuspenseQuery(userQuery(userId, days));

  if (!data.user && !data.error) {
    return (
      <Card className="p-8 text-center">
        <h2 className="text-lg font-semibold">User not found</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          We couldn't find this user in the database.
        </p>
      </Card>
    );
  }

  const totalInRange = data.series.reduce((acc, p) => acc + p.queries, 0);
  const chartConfig: ChartConfig = {
    queries: { label: "Queries", color: "var(--chart-2)" },
  };

  return (
    <>
      {data.error && <DataErrorBanner message={data.error} />}

      {data.user && (
        <>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {data.user.name ?? data.user.email.split("@")[0]}
            </h1>
            <p className="text-sm text-muted-foreground">{data.user.email}</p>
          </div>

          <Card className="p-5">
            <h2 className="mb-4 text-sm font-semibold text-muted-foreground">Account summary</h2>
            <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              <SummaryItem label="Name" value={data.user.name ?? "—"} />
              <SummaryItem label="Email" value={data.user.email} />
              <SummaryItem label="Last session" value={fmtDateTime(data.user.lastSession)} />
              <SummaryItem label="Created" value={fmtDateTime(data.user.createdAt)} />
              <SummaryItem label="Last payment" value="N/A" />
            </dl>
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold">Queries</h2>
                <p className="text-xs text-muted-foreground">
                  {fmtNumber.format(totalInRange)} queries in the last {days} days
                </p>
              </div>
              <Tabs
                value={String(days)}
                onValueChange={(v) => setDays(parseInt(v, 10))}
              >
                <TabsList>
                  {RANGES.map((r) => (
                    <TabsTrigger key={r.value} value={String(r.value)}>
                      {r.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
            <ChartContainer config={chartConfig} className="h-[260px] w-full">
              <ResponsiveContainer>
                <AreaChart data={data.series} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fill-user-queries" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    minTickGap={24}
                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={36}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="queries"
                    stroke="var(--chart-2)"
                    strokeWidth={2.5}
                    fill="url(#fill-user-queries)"
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </Card>

          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b p-5">
              <div>
                <h2 className="text-base font-semibold">Payments</h2>
                <p className="text-xs text-muted-foreground">
                  Credit recharges made by this user
                </p>
              </div>
              <span className="text-xs text-muted-foreground">N/A</span>
            </div>
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">
              Payments data source is not available yet
            </div>
          </Card>
        </>
      )}
    </>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <>
      <Skeleton className="h-8 w-48" />
      <Card className="flex h-[200px] items-center justify-center p-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading user…
        </div>
      </Card>
    </>
  );
}
