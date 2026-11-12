import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import {
  MessageSquare,
  MessagesSquare,
  Sparkles,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  UserX,
  Zap,
  Clock,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
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
import { UserCohortTable } from "@/components/dashboard/UserCohortTable";
import {
  getRetention,
  type RetentionResponse,
  type RetentionStatus,
} from "@/lib/tracking.functions";
import type { RangeKey } from "@/lib/mock-analytics";

type Params = {
  range: RangeKey;
  from?: string;
  to?: string;
  status: RetentionStatus;
};

const retentionQuery = (p: Params) =>
  queryOptions({
    queryKey: ["retention", p],
    queryFn: () => getRetention({ data: p }),
    staleTime: 30_000,
  });

const DEFAULTS: Params = { range: "allTime", status: "all" };

export const Route = createFileRoute("/dashboard/retencion")({
  loader: ({ context }) => context.queryClient.ensureQueryData(retentionQuery(DEFAULTS)),
  head: () => ({
    meta: [
      { title: "Retención — Sententia Analytics" },
      { name: "description", content: "Actividad, retención mensual y cohortes de los usuarios de Sententia." },
      { property: "og:title", content: "Retención — Sententia Analytics" },
      { property: "og:description", content: "Actividad, retención mensual y cohortes de los usuarios de Sententia." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RetencionPage,
});

function RetencionPage() {
  const [range, setRange] = useState<RangeKey>("allTime");
  const [from, setFrom] = useState<string | undefined>();
  const [to, setTo] = useState<string | undefined>();
  const [status, setStatus] = useState<RetentionStatus>("all");

  const params: Params = { range, from, to, status };

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Retención</h1>
        <p className="text-sm text-muted-foreground">
          Cómo vuelven los usuarios de Sententia: actividad, retención mensual y cohortes.
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
        <Tabs value={status} onValueChange={(v) => setStatus(v as RetentionStatus)}>
          <TabsList className="h-8">
            <TabsTrigger value="all" className="px-3 text-xs">
              Todos
            </TabsTrigger>
            <TabsTrigger value="active" className="px-3 text-xs">
              Activos
            </TabsTrigger>
            <TabsTrigger value="inactive" className="px-3 text-xs">
              Inactivos
            </TabsTrigger>
            <TabsTrigger value="never" className="px-3 text-xs">
              Nunca activados
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Suspense fallback={<RetencionSkeleton />}>
        <RetencionContent params={params} />
      </Suspense>
    </div>
  );
}

const fmt = new Intl.NumberFormat("en-US");

function pct(value: number, total: number): string {
  if (total === 0) return "0%";
  return `${((value / total) * 100).toFixed(1)}%`;
}

function StatCard({
  label,
  description,
  value,
  total,
  icon: Icon,
}: {
  label: string;
  description?: string;
  value: number;
  total?: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="relative overflow-hidden p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{fmt.format(value)}</p>
          {total !== undefined && (
            <p className="mt-1 text-xs font-medium text-foreground/70">
              {pct(value, total)} <span className="text-muted-foreground">del total</span>
            </p>
          )}
          {description && <p className="mt-2 text-xs text-muted-foreground">{description}</p>}
        </div>
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-brand-foreground"
          style={{ backgroundImage: "var(--gradient-brand)" }}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
    </Card>
  );
}

/** Purple heat cell: intensity proportional to the percentage. */
function heatStyle(v: number | null): React.CSSProperties {
  if (v === null) return {};
  const alpha = 0.08 + (v / 100) * 0.72;
  return {
    backgroundColor: `hsl(262 83% 58% / ${alpha.toFixed(2)})`,
    color: alpha > 0.45 ? "#FFFFFF" : "inherit",
  };
}

function RetencionContent({ params }: { params: Params }) {
  const { data } = useSuspenseQuery(retentionQuery(params));
  const { activity, statusCounts, postReg, cohort } = data;
  const filteredTotal = data.totalUsers;

  return (
    <>
      {data.error && <DataErrorBanner message={data.error} />}

      <Card
        className="relative overflow-hidden p-6"
        style={{ backgroundImage: "var(--gradient-brand)" }}
      >
        <div className="flex items-center justify-between text-brand-foreground">
          <div>
            <p className="text-sm font-medium opacity-90">Usuarios totales de Sententia</p>
            <p className="mt-2 text-5xl font-semibold tracking-tight">
              {fmt.format(statusCounts.total)}
            </p>
          </div>
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
            <Users className="h-7 w-7" />
          </div>
        </div>
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Estado de los usuarios</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard
            label="Activos"
            description="Consultaron en los últimos 30 días"
            value={statusCounts.active}
            total={statusCounts.total}
            icon={Zap}
          />
          <StatCard
            label="Inactivos"
            description="Consultaron alguna vez, pero no en los últimos 30 días"
            value={statusCounts.inactive}
            total={statusCounts.total}
            icon={Clock}
          />
          <StatCard
            label="Nunca activados"
            description="Registrados sin ninguna consulta"
            value={statusCounts.neverActivated}
            total={statusCounts.total}
            icon={UserX}
          />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Actividad de consultas</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            label="Sin consultas"
            description="Nunca hicieron una consulta"
            value={activity.zero}
            total={filteredTotal}
            icon={UserX}
          />
          <StatCard
            label="Con al menos una consulta"
            description="Hicieron ≥ 1 consulta"
            value={activity.atLeastOne}
            total={filteredTotal}
            icon={MessageSquare}
          />
          <StatCard
            label="1 consulta"
            description="Una sola consulta"
            value={activity.one}
            total={filteredTotal}
            icon={MessageSquare}
          />
          <StatCard
            label="2 a 3 consultas"
            description="Uso ocasional"
            value={activity.twoToThree}
            total={filteredTotal}
            icon={MessagesSquare}
          />
          <StatCard
            label="4 a 10 consultas"
            description="Uso frecuente"
            value={activity.fourToTen}
            total={filteredTotal}
            icon={MessagesSquare}
          />
          <StatCard
            label="Más de 10 consultas"
            description="Uso intensivo"
            value={activity.moreThanTen}
            total={filteredTotal}
            icon={Sparkles}
          />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Retención post-registro</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <StatCard
            label="Se registraron y no volvieron (sin consultas)"
            description="Crearon la cuenta y nunca consultaron"
            value={postReg.signupOnlyNoQueries}
            total={statusCounts.total}
            icon={UserMinus}
          />
          <StatCard
            label="Se registraron y no volvieron (con consultas)"
            description="Consultaron sólo el día de registro"
            value={postReg.signupOnlyWithQueries}
            total={statusCounts.total}
            icon={UserCheck}
          />
          <StatCard
            label="Volvieron otro día a consultar"
            description="Consultaron en un día distinto al de registro"
            value={postReg.returnedDifferentDay}
            total={statusCounts.total}
            icon={UserPlus}
          />
        </div>
      </section>

      <Card className="p-5">
        <div className="mb-4">
          <h2 className="text-base font-semibold">Usuarios activos por mes</h2>
          <p className="text-xs text-muted-foreground">
            Nuevos: su primera consulta fue ese mes. Recurrentes: ya habían consultado antes.
          </p>
        </div>
        {data.monthly.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Sin datos para los filtros seleccionados.
          </p>
        ) : (
          <div className="h-[280px] w-full">
            <ResponsiveContainer>
              <BarChart data={data.monthly} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
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
                    name === "newUsers" ? "Nuevos" : name === "recurring" ? "Recurrentes" : name,
                  ]}
                  labelFormatter={(_label, payload) => {
                    const p = payload?.[0]?.payload as
                      | RetentionResponse["monthly"][number]
                      | undefined;
                    return p
                      ? `${p.label} · Activos: ${fmt.format(p.active)} · Consultas: ${fmt.format(p.queries)}`
                      : _label;
                  }}
                />
                <Bar dataKey="newUsers" stackId="a" fill="var(--chart-1)" radius={[0, 0, 0, 0]} />
                <Bar
                  dataKey="recurring"
                  stackId="a"
                  fill="var(--chart-2)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card className="p-5">
        <div className="mb-4">
          <h2 className="text-base font-semibold">Retención mensual</h2>
          <p className="text-xs text-muted-foreground">
            De los usuarios activos en el mes anterior, % que también estuvo activo en este mes.
          </p>
        </div>
        {data.retention.length < 2 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Se necesitan al menos dos meses con datos.
          </p>
        ) : (
          <div className="h-[240px] w-full">
            <ResponsiveContainer>
              <LineChart data={data.retention} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
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
                <Tooltip
                  formatter={(value) => [
                    typeof value === "number" ? `${value}%` : "N/A",
                    "Retención",
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="var(--chart-3)"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card className="p-5">
        <div className="mb-4">
          <h2 className="text-base font-semibold">Cohorte agregada</h2>
          <p className="text-xs text-muted-foreground">
            % de usuarios de cada mes de registro que consultaron en cada mes siguiente.
          </p>
        </div>
        {cohort.rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Sin datos para los filtros seleccionados.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="border-collapse text-xs">
              <thead>
                <tr>
                  <th className="border-b bg-muted/50 px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">
                    Mes de registro
                  </th>
                  <th className="border-b bg-muted/50 px-3 py-2 text-center font-medium text-muted-foreground">
                    Tamaño
                  </th>
                  {cohort.columns.map((o) => (
                    <th
                      key={o}
                      className="border-b bg-muted/50 px-3 py-2 text-center font-medium text-muted-foreground whitespace-nowrap"
                    >
                      Mes {o}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cohort.rows.map((row) => (
                  <tr key={row.month}>
                    <td className="border-b px-3 py-1.5 font-medium whitespace-nowrap">
                      {row.label}
                    </td>
                    <td className="border-b px-3 py-1.5 text-center tabular-nums">{row.size}</td>
                    {cohort.columns.map((o) => {
                      const v = row.values[o] ?? null;
                      return (
                        <td
                          key={o}
                          className="border-b px-3 py-1.5 text-center tabular-nums"
                          style={heatStyle(v)}
                        >
                          {v === null ? "" : `${v.toFixed(0)}%`}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <UserCohortTable {...data.userCohort} />
    </>
  );
}

function RetencionSkeleton() {
  return (
    <>
      <Card className="p-6">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="mt-3 h-12 w-32" />
      </Card>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
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
