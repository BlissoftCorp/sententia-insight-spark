import { useMemo, useState } from "react";
import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  findUser,
  getUserLastPayment,
  getUserPayments,
  getUserQueriesSeries,
} from "@/lib/mock-user-detail";

export const Route = createFileRoute("/dashboard/users_/$userId")({
  loader: ({ params }) => {
    const user = findUser(params.userId);
    if (!user) throw notFound();
    return { user };
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData?.user
          ? `${loaderData.user.name} — Sententia Analytics`
          : "User — Sententia Analytics",
      },
    ],
  }),
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl py-16 text-center">
      <h1 className="text-2xl font-semibold">User not found</h1>
      <p className="mt-2 text-muted-foreground">
        We couldn't find that user.
      </p>
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
const fmtCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

function fmtDateTime(iso: string) {
  return format(new Date(iso), "d/M/yyyy HH:mm:ss");
}

const RANGES = [
  { value: "7", label: "7d" },
  { value: "30", label: "30d" },
  { value: "90", label: "90d" },
] as const;

function UserDetailPage() {
  const { user } = Route.useLoaderData();
  const [range, setRange] = useState<(typeof RANGES)[number]["value"]>("30");

  const days = parseInt(range, 10);
  const series = useMemo(() => getUserQueriesSeries(user.id, days), [user.id, days]);
  const payments = useMemo(() => getUserPayments(user.id), [user.id]);
  const lastPayment = useMemo(() => getUserLastPayment(user.id), [user.id]);

  const totalInRange = series.reduce((acc, p) => acc + p.queries, 0);

  const chartConfig: ChartConfig = {
    queries: { label: "Queries", color: "var(--chart-2)" },
  };

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

      {/* Account summary */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{user.name}</h1>
        <p className="text-sm text-muted-foreground">{user.email}</p>
      </div>

      <Card className="p-5">
        <h2 className="mb-4 text-sm font-semibold text-muted-foreground">
          Account summary
        </h2>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <SummaryItem label="Name" value={user.name} />
          <SummaryItem label="Email" value={user.email} />
          <SummaryItem label="Last session" value={fmtDateTime(user.lastSession)} />
          <SummaryItem label="Created" value={fmtDateTime(user.createdAt)} />
          <SummaryItem
            label="Last payment"
            value={
              lastPayment
                ? `${fmtCurrency.format(lastPayment.price)} · ${fmtDateTime(lastPayment.createdAt)}`
                : "—"
            }
          />
        </dl>
      </Card>

      {/* Queries chart */}
      <Card className="p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">Queries</h2>
            <p className="text-xs text-muted-foreground">
              {fmtNumber.format(totalInRange)} queries in the last {days} days
            </p>
          </div>
          <Tabs value={range} onValueChange={(v) => setRange(v as typeof range)}>
            <TabsList>
              {RANGES.map((r) => (
                <TabsTrigger key={r.value} value={r.value}>
                  {r.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        <ChartContainer config={chartConfig} className="h-[260px] w-full">
          <ResponsiveContainer>
            <AreaChart data={series} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
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

      {/* Payments */}
      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b p-5">
          <div>
            <h2 className="text-base font-semibold">Payments</h2>
            <p className="text-xs text-muted-foreground">
              Credit recharges made by this user
            </p>
          </div>
          <span className="text-xs text-muted-foreground">
            {fmtNumber.format(payments.length)} total
          </span>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Operation ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Credits</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.operationId}>
                  <TableCell className="font-mono text-xs">{p.operationId}</TableCell>
                  <TableCell>
                    <Badge
                      variant={p.status === "approved" ? "default" : "secondary"}
                      className="capitalize"
                    >
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmtCurrency.format(p.price)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmtNumber.format(p.tokens)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums text-muted-foreground">
                    {fmtDateTime(p.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
              {payments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    No payments yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
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
