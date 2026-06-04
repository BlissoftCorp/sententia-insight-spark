import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Suspense } from "react";
import {
  Users,
  UserX,
  MessageSquare,
  MessagesSquare,
  Sparkles,
  UserMinus,
  UserCheck,
  Loader2,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DataErrorBanner } from "@/components/dashboard/DataErrorBanner";
import { getTracking, type TrackingResponse } from "@/lib/analytics.functions";

const trackingQuery = queryOptions({
  queryKey: ["tracking"],
  queryFn: () => getTracking(),
  staleTime: 30_000,
});

export const Route = createFileRoute("/dashboard/tracking")({
  loader: ({ context }) => context.queryClient.ensureQueryData(trackingQuery),
  head: () => ({
    meta: [
      { title: "Tracking — Sententia Analytics" },
      { name: "description", content: "User behavior KPIs for Sententia." },
    ],
  }),
  component: TrackingPage,
});

function TrackingPage() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tracking</h1>
        <p className="text-sm text-muted-foreground">
          Comportamiento de los usuarios de Sententia.
        </p>
      </div>

      <Suspense fallback={<TrackingSkeleton />}>
        <TrackingContent />
      </Suspense>
    </div>
  );
}

const fmt = new Intl.NumberFormat("en-US");

function pct(value: number, total: number): string {
  if (total === 0) return "0%";
  return `${((value / total) * 100).toFixed(1)}%`;
}

function TrackingContent() {
  const { data } = useSuspenseQuery(trackingQuery);
  const total = data.totalUsers;

  return (
    <>
      {data.error && <DataErrorBanner message={data.error} />}

      <Card
        className="relative overflow-hidden p-6"
        style={{ backgroundImage: "var(--gradient-brand)" }}
      >
        <div className="flex items-center justify-between text-brand-foreground">
          <div>
            <p className="text-sm font-medium opacity-90">
              Usuarios totales de Sententia
            </p>
            <p className="mt-2 text-5xl font-semibold tracking-tight">
              {fmt.format(total)}
            </p>
          </div>
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
            <Users className="h-7 w-7" />
          </div>
        </div>
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Actividad de consultas
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <TrackingKpi
            label="Sin consultas"
            description="Nunca hicieron una consulta"
            value={data.zeroQueries}
            total={total}
            icon={UserX}
          />
          <TrackingKpi
            label="Con al menos una consulta"
            description="Hicieron ≥ 1 consulta"
            value={data.atLeastOne}
            total={total}
            icon={MessageSquare}
          />
          <TrackingKpi
            label="Entre 1 y 5 consultas"
            description="Uso ligero"
            value={data.oneToFive}
            total={total}
            icon={MessagesSquare}
          />
          <TrackingKpi
            label="Más de 5 consultas"
            description="Uso recurrente"
            value={data.moreThanFive}
            total={total}
            icon={Sparkles}
          />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Retención post-registro
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <TrackingKpi
            label="Se registraron y no volvieron (sin consultas)"
            description="Crearon la cuenta y nunca consultaron"
            value={data.signupOnlyNoQueries}
            total={total}
            icon={UserMinus}
          />
          <TrackingKpi
            label="Se registraron y no volvieron (con consultas)"
            description="Consultaron sólo el día de registro"
            value={data.signupOnlyWithQueries}
            total={total}
            icon={UserCheck}
          />
        </div>
      </section>
    </>
  );
}

type KpiProps = {
  label: string;
  description: string;
  value: number;
  total: number;
  icon: React.ComponentType<{ className?: string }>;
};

function TrackingKpi({ label, description, value, total, icon: Icon }: KpiProps) {
  return (
    <Card className="relative overflow-hidden p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">
            {fmt.format(value)}
          </p>
          <p className="mt-1 text-xs font-medium text-foreground/70">
            {pct(value, total)}{" "}
            <span className="text-muted-foreground">del total</span>
          </p>
          <p className="mt-2 text-xs text-muted-foreground">{description}</p>
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

function TrackingSkeleton() {
  return (
    <>
      <Card className="p-6">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="mt-3 h-12 w-32" />
      </Card>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-3 h-8 w-32" />
          </Card>
        ))}
      </div>
      <Card className="flex h-[120px] items-center justify-center p-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading data…
        </div>
      </Card>
    </>
  );
}

// Keep type import for the route boundary
export type _TrackingResponseRef = TrackingResponse;
