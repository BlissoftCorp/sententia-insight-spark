import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";

type Props = {
  label: string;
  value: number;
  icon: LucideIcon;
  format?: "number" | "currency";
};

const fmtNumber = new Intl.NumberFormat("en-US");
const fmtCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function KpiCard({ label, value, icon: Icon, format = "number" }: Props) {
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
          className="flex h-7 w-7 items-center justify-center rounded-lg text-brand-foreground"
          style={{ backgroundImage: "var(--gradient-brand)" }}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
    </Card>
  );
}
