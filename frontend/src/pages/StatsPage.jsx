import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Separator } from "@/components/ui/separator";

import CsvImportPanel from "../components/CsvImportPanel";
import { getStats } from "../api/stats";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const chartConfig = { value: { label: "Count" } };

function distributionToChartData(distribution) {
  return Object.entries(distribution).map(([label, value], index) => ({
    id: index,
    label,
    value,
  }));
}

export default function StatsPage() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    getStats().then(setStats);
  }, []);

  if (!stats) {
    return null;
  }

  const formatData = distributionToChartData(stats.format_distribution);
  const conditionData = distributionToChartData(stats.condition_distribution);
  const genreData = distributionToChartData(stats.genre_distribution);
  const cumulativeSeries = stats.cumulative_value_by_date_added;

  const totalValueLabel =
    stats.total_estimated_value !== null
      ? `$${Number(stats.total_estimated_value).toFixed(2)}`
      : "—";

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Stats</h1>

      <div className="mb-6 flex flex-wrap gap-4">
        <Card className="min-w-40 flex-1">
          <CardContent className="space-y-1">
            <p className="text-sm text-muted-foreground">Estimated Value</p>
            <p className="text-3xl font-semibold tracking-tight">{totalValueLabel}</p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Format Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-56">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="label" hideLabel />} />
                <Pie data={formatData} dataKey="value" nameKey="label" innerRadius={40}>
                  {formatData.map((entry, index) => (
                    <Cell key={entry.label} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Condition Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="max-h-56 w-full">
              <BarChart data={conditionData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Bar dataKey="value" fill="var(--chart-1)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Genre Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="max-h-56 w-full">
              <BarChart data={genreData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Bar dataKey="value" fill="var(--chart-2)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Cumulative Value by Date Added</CardTitle>
          <p className="text-xs text-muted-foreground">
            Approximates collection growth based on when items were added, valued at
            today&apos;s prices — not a historical record of actual market price changes.
          </p>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="max-h-56 w-full">
            <LineChart
              data={cumulativeSeries.map((point) => ({
                date_added: point.date_added,
                value: Number(point.cumulative_value),
              }))}
            >
              <CartesianGrid vertical={false} />
              <XAxis dataKey="date_added" tickLine={false} axisLine={false} fontSize={11} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    hideLabel
                    formatter={(value) => `$${Number(value).toFixed(2)}`}
                  />
                }
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="var(--chart-1)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Separator className="mb-6" />

      <CsvImportPanel />
    </div>
  );
}
