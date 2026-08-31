import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { BarChart } from "@mui/x-charts/BarChart";
import { LineChart } from "@mui/x-charts/LineChart";
import { PieChart } from "@mui/x-charts/PieChart";

import CsvImportPanel from "../components/CsvImportPanel";
import { getStats } from "../api/stats";

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
    <Box>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
        Stats
      </Typography>

      <Stack direction="row" spacing={2} sx={{ mb: 3, flexWrap: "wrap" }}>
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, flex: 1, minWidth: 160 }}>
          <Typography variant="body2" color="text.secondary">
            Estimated Value
          </Typography>
          <Typography variant="h4" fontWeight={700}>
            {totalValueLabel}
          </Typography>
        </Paper>
      </Stack>

      <Stack direction="row" spacing={2} sx={{ mb: 3, flexWrap: "wrap" }}>
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, flex: 1, minWidth: 220 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Format Distribution
          </Typography>
          <PieChart series={[{ data: formatData }]} height={220} />
        </Paper>
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, flex: 1, minWidth: 220 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Condition Distribution
          </Typography>
          <BarChart
            xAxis={[{ scaleType: "band", data: conditionData.map((d) => d.label) }]}
            series={[{ data: conditionData.map((d) => d.value) }]}
            height={220}
          />
        </Paper>
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, flex: 1, minWidth: 220 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Genre Distribution
          </Typography>
          <BarChart
            xAxis={[{ scaleType: "band", data: genreData.map((d) => d.label) }]}
            series={[{ data: genreData.map((d) => d.value) }]}
            height={220}
          />
        </Paper>
      </Stack>

      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 3 }}>
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
          Cumulative Value by Date Added
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
          Approximates collection growth based on when items were added, valued at
          today's prices — not a historical record of actual market price changes.
        </Typography>
        <LineChart
          xAxis={[{ scaleType: "point", data: cumulativeSeries.map((point) => point.date_added) }]}
          series={[
            {
              data: cumulativeSeries.map((point) => Number(point.cumulative_value)),
              valueFormatter: (value) => (value == null ? "" : `$${value.toFixed(2)}`),
            },
          ]}
          height={220}
        />
      </Paper>

      <Divider sx={{ mb: 3 }} />

      <CsvImportPanel />
    </Box>
  );
}
