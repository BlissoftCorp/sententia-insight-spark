import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";

type Props = {
  label: string;
  value: number | null;
  icon: LucideIcon;
  delta?: number | null;
  format?: "number" | "currency";
};

const fmtNumber = new Intl.NumberFormat("en-US");
const fmtCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function KpiCard({ label, value, icon: Icon, delta, format = "number" }: Props) {
  const isNA = value === null;
  const display = isNA
    ? "N/A"
    : format === "currency"
      ? fmtCurrency.format(value)
      : fmtNumber.format(value);

  const deltaText =
    delta === null || delta === undefined
      ? null
      : `${delta > 0 ? "+" : ""}${delta.toFixed(1)}%`;
  const deltaColor =
    delta === null || delta === undefined
      ? ""
      : delta > 0
        ? "text-emerald-600 dark:text-emerald-400"
        : delta < 0
          ? "text-rose-600 dark:text-rose-400"
          : "text-muted-foreground";

  return (
    <Card className="relative overflow-hidden p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{display}</p>
          {deltaText && !isNA && (
            <p className={`mt-1 text-xs font-medium ${deltaColor}`}>
              {deltaText} <span className="text-muted-foreground">vs prev</span>
            </p>
          )}
          {isNA && (
            <p
              className="mt-1 text-xs font-medium text-muted-foreground"
              title="Data source not available yet"
            >
              Not available
            </p>
          )}
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
