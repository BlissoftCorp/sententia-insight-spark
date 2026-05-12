import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: number;
  delta: number;
  icon: LucideIcon;
  format?: "number" | "currency";
};

const fmtNumber = new Intl.NumberFormat("en-US");
const fmtCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function KpiCard({ label, value, delta, icon: Icon, format = "number" }: Props) {
  const positive = delta >= 0;
  return (
    <Card className="relative overflow-hidden p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">
            {format === "currency" ? fmtCurrency.format(value) : fmtNumber.format(value)}
          </p>
        </div>
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl text-brand-foreground"
          style={{ backgroundImage: "var(--gradient-brand)" }}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div
        className={cn(
          "mt-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
          positive
            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            : "bg-destructive/10 text-destructive",
        )}
      >
        {positive ? (
          <ArrowUpRight className="h-3 w-3" />
        ) : (
          <ArrowDownRight className="h-3 w-3" />
        )}
        {positive ? "+" : ""}
        {delta.toFixed(1)}%
        <span className="ml-1 text-muted-foreground">vs prev.</span>
      </div>
    </Card>
  );
}
