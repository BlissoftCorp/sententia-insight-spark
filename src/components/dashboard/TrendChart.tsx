import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { getLast7Days } from "@/lib/mock-analytics";

const config = {
  newUsers: { label: "New users", color: "var(--chart-1)" },
  queries: { label: "Queries", color: "var(--chart-2)" },
  payments: { label: "Payments", color: "var(--chart-3)" },
} satisfies ChartConfig;

export function TrendChart() {
  const data = getLast7Days();
  return (
    <Card className="p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold">Last 7 days overview</h2>
        <p className="text-sm text-muted-foreground">
          New users, queries and payments — daily
        </p>
      </div>
      <ChartContainer config={config} className="h-[320px] w-full">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
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
              tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
            />
            <Tooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Line
              type="monotone"
              dataKey="newUsers"
              stroke="var(--color-newUsers)"
              strokeWidth={2.5}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="queries"
              stroke="var(--color-queries)"
              strokeWidth={2.5}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="payments"
              stroke="var(--color-payments)"
              strokeWidth={2.5}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>
    </Card>
  );
}
