import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Percent, Timer, UserPlus, Zap } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataErrorBanner } from "@/components/dashboard/DataErrorBanner";
import { DateRangeFilter } from "@/components/dashboard/DateRangeFilter";
import { ActivationGauge } from "@/components/dashboard/Gauge";
import { getActivation, type ActivationResponse } from "@/lib/tracking.functions";
import type { RangeKey } from "@/lib/mock-analytics";

type Granularity = "week" | "month";

type Params = {
  range: RangeKey;
  from?: string;
  to?: string;
  granularity: Granularity;
};

const activationQuery = (p: Params) =>
  queryOptions({
    queryKey: ["activation", p],
    queryFn: () => getActivation({ data: p }),
    staleTime: 30_000,
  });

const DEFAULTS: Params = { range: "allTime", granularity: "week" };

export const Route = createFileRoute("/dashboard/activacion")({
  loader: ({ context }) => context.queryClient.ensureQueryData(activationQuery(DEFAULTS)),
  head: () => ({
    meta: [
      { title: "Activación — Sententia Analytics" },
      { name: "description", content: "Registros, activación y tiempo hasta la primera consulta de los usuarios de Sententia." },
      { property: "og:title", content: "Activación — Sententia Analytics" },
      { property: "og:description", content: "Registros, activación y tiempo hasta la primera consulta de los usuarios de Sententia." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ActivacionPage,
});

function ActivacionPage() {
  const [range, setRange] = useState<RangeKey>("allTime");
  const [from, setFrom] = useState<string | undefined>();
  const [to, setTo] = useState<string | undefined>();
  const [granularity, setGranularity] = useState<Granularity>("week");

  const params: Params = { range, from, to, granularity };

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Activación</h1>
        <p className="text-sm text-muted-foreground">
          Cómo se activan los usuarios de Sententia: registros, primera consulta y tiempo hasta activación.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <DateRangeFilter
          range={range}
          from={from}
          to={to}
          onChange={(next) => {
            setRange(next.range);
            setFrom(next.from);
            setTo(next.to);
          }}
        />
        <Tabs value={granularity} onValueChange={(v) => setGranularity(v as Granularity)}>
          <TabsList className="h-8">
            <TabsTrigger value="week" className="px-3 text-xs">
              Semana
            </TabsTrigger>
            <TabsTrigger value="month" className="px-3 text-xs">
              Mes
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Suspense fallback={<ActivacionSkeleton />}>
        <ActivacionContent params={params} />
      </Suspense>
    </div>
  );
}

const fmt = new Intl.NumberFormat("en-US");

function formatMedian(minutes: number | null): string {
  if (minutes === null) return "N/A";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  return `${(minutes / 60).toFixed(1)} h`;
}

function periodLabel(iso: string, granularity: Granularity): string {
  const d = new Date(iso);
  if (granularity === "month") return format(d, "MMM yyyy", { locale: es });
  return `sem ${format(d, "d MMM", { locale: es })}`;
}

function KpiCardLocal({
  label,
  value,
  icon: Icon,
  sub,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  sub?: string;
}) {
  return (
    <Card className="relative overflow-hidden p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
          {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
        </div>
        <div
          className="flex h-7 w-7 items-center justify-center rounded-lg text-brand-foreground"
          style={{ backgroundImage: "var(--gradient-brand)" }}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
    </Card>
  );
}

function EmptyChart({ title, description }: { title: string; description?: string }) {
  return (
    <Card className="flex h-[260px] flex-col items-center justify-center gap-1 p-5">
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">
        {description ?? "Sin datos para el rango seleccionado."}
      </p>
    </Card>
  );
}

function ActivacionContent({ params }: { params: Params }) {
  const { data } = useSuspenseQuery(activationQuery(params));
  const { kpis } = data;

  const periods = data.periods.map((p) => ({
    ...p,
    label: periodLabel(p.period, params.granularity),
  }));

  return (
    <>
      {data.error && <DataErrorBanner message={data.error} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCardLocal label="Registros" value={fmt.format(kpis.signups)} icon={UserPlus} />
        <KpiCardLocal label="Activados" value={fmt.format(kpis.activated)} icon={Zap} />
        <KpiCardLocal
          label="Tasa de activación"
          value={`${kpis.activationRate.toFixed(1)}%`}
          icon={Percent}
          sub="activados / registros"
        />
        <KpiCardLocal
          label="Mediana tiempo hasta activación"
          value={formatMedian(kpis.medianMinutes)}
          icon={Timer}
          sub="del registro a la primera consulta"
        />
      </div>

      {periods.length === 0 ? (
        <EmptyChart title="Registros vs. activados" />
      ) : (
        <Card className="p-5">
          <div className="mb-4">
            <h2 className="text-base font-semibold">Registros vs. activados</h2>
            <p className="text-xs text-muted-foreground">
              Barras: registros del periodo. Línea: de ese grupo, cuántos hicieron al menos una consulta.
            </p>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer>
              <ComposedChart data={periods} margin={{ top: 20, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={36}
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    fmt.format(value),
                    name === "signups" ? "Registros" : "Activados",
                  ]}
                />
                <Bar dataKey="signups" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={48}>
                  <LabelList
                    dataKey="signups"
                    position="top"
                    style={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                </Bar>
                <Line
                  type="monotone"
                  dataKey="activated"
                  stroke="var(--chart-2)"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {periods.length === 0 ? (
          <EmptyChart title="Tasa de activación" />
        ) : (
          <Card className="p-5 lg:col-span-2">
            <div className="mb-4">
              <h2 className="text-base font-semibold">Tasa de activación</h2>
              <p className="text-xs text-muted-foreground">
                % de activados por periodo de registro.
              </p>
            </div>
            <div className="h-[240px] w-full">
              <ResponsiveContainer>
                <AreaChart data={periods} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fill-rate" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={40}
                    domain={[0, 100]}
                    tickFormatter={(v: number) => `${v}%`}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                  <Tooltip formatter={(value: number) => [`${value}%`, "Tasa de activación"]} />
                  <Area
                    type="monotone"
                    dataKey="rate"
                    stroke="var(--chart-2)"
                    strokeWidth={2.5}
                    fill="url(#fill-rate)"
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        <Card className="p-5">
          <div className="mb-2">
            <h2 className="text-base font-semibold">Tasa global del rango</h2>
            <p className="text-xs text-muted-foreground">Activados / registros del rango filtrado.</p>
          </div>
          <ActivationGauge value={kpis.activationRate} />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {periods.length === 0 ? (
          <EmptyChart title="Tiempo hasta activación" />
        ) : (
          <Card className="p-5 lg:col-span-2">
            <div className="mb-4">
              <h2 className="text-base font-semibold">Tiempo hasta activación (mediana)</h2>
              <p className="text-xs text-muted-foreground">
                Minutos del registro a la primera consulta, por periodo de registro.
              </p>
            </div>
            <div className="h-[240px] w-full">
              <ResponsiveContainer>
                <LineChart data={periods} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={48}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                  <Tooltip
                    formatter={(value: number | null) => [
                      value === null ? "N/A" : formatMedian(value),
                      "Mediana",
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="medianMinutes"
                    stroke="var(--chart-3)"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        <Card className="p-5">
          <div className="mb-4">
            <h2 className="text-base font-semibold">Distribución de activados</h2>
            <p className="text-xs text-muted-foreground">Por tramo de tiempo hasta la primera consulta.</p>
          </div>
          {kpis.activated === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Sin activados en el rango.</p>
          ) : (
            <div className="h-[240px] w-full">
              <ResponsiveContainer>
                <BarChart
                  data={data.distribution}
                  layout="vertical"
                  margin={{ top: 0, right: 56, left: 0, bottom: 0 }}
                >
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={104}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                  <Tooltip
                    formatter={(value: number, _name: string, item: { payload?: { pct?: number } }) => [
                      `${fmt.format(value)} (${item?.payload?.pct ?? 0}%)`,
                      "Activados",
                    ]}
                  />
                  <Bar dataKey="count" fill="var(--chart-1)" radius={[0, 4, 4, 0]} maxBarSize={22}>
                    <LabelList
                      dataKey="count"
                      position="right"
                      formatter={(v: number) => fmt.format(v)}
                      style={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

function ActivacionSkeleton() {
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
      <Card className="p-5">
        <Skeleton className="h-[280px] w-full" />
      </Card>
    </>
  );
}

// Keep type import for the route boundary
export type _ActivationResponseRef = ActivationResponse;
