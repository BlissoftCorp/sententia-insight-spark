import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { getLast7Days, type TrendPoint } from "@/lib/mock-analytics";

type Metric = {
  key: keyof Pick<TrendPoint, "newUsers" | "queries" | "payments">;
  label: string;
  description: string;
  colorVar: string;
  format?: "number" | "currency";
};

const METRICS: Metric[] = [
  {
    key: "newUsers",
    label: "New users",
    description: "Daily sign-ups, last 7 days",
    colorVar: "var(--chart-1)",
    format: "number",
  },
  {
    key: "queries",
    label: "Queries",
    description: "AI queries per day, last 7 days",
    colorVar: "var(--chart-2)",
    format: "number",
  },
  {
    key: "payments",
    label: "Payments",
    description: "Revenue per day, last 7 days",
    colorVar: "var(--chart-3)",
    format: "currency",
  },
];

const fmtNumber = new Intl.NumberFormat("en-US");
const fmtCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function TrendChart() {
  const data = getLast7Days();

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {METRICS.map((m) => {
        const config = {
          [m.key]: { label: m.label, color: m.colorVar },
        } satisfies ChartConfig;

        return (
          <Card key={m.key} className="p-5">
            <div className="mb-4">
              <h2 className="text-base font-semibold">{m.label}</h2>
              <p className="text-xs text-muted-foreground">{m.description}</p>
            </div>
            <ChartContainer config={config} className="h-[200px] w-full">
              <ResponsiveContainer>
                <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id={`fill-${m.key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={m.colorVar} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={m.colorVar} stopOpacity={0} />
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
                    width={36}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey={m.key}
                    stroke={m.colorVar}
                    strokeWidth={2.5}
                    fill={`url(#fill-${m.key})`}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </Card>
        );
      })}
    </div>
  );
}
