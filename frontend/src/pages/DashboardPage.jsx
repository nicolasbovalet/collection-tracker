import { useEffect, useState } from "react";
import AlbumIcon from "@mui/icons-material/Album";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardMedia from "@mui/material/CardMedia";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { getStats } from "../api/stats";

function StatTile({ label, value }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, flex: 1, minWidth: 160 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h4" fontWeight={700}>
        {value}
      </Typography>
    </Paper>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    getStats().then(setStats);
  }, []);

  if (!stats) {
    return null;
  }

  const totalValueLabel =
    stats.total_estimated_value !== null
      ? `$${Number(stats.total_estimated_value).toFixed(2)}`
      : "—";

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
        Dashboard
      </Typography>
      <Stack direction="row" spacing={2} sx={{ mb: 3, flexWrap: "wrap" }}>
        <StatTile label="Collection" value={stats.collection_count} />
        <StatTile label="Wishlist" value={stats.wishlist_count} />
        <StatTile label="Estimated Value" value={totalValueLabel} />
      </Stack>
      <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 600 }}>
        Recent Additions
      </Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 2 }}>
        {stats.recent_additions.map((release) => (
          <Card key={release.id} variant="outlined" sx={{ borderRadius: 2 }}>
            {release.cover_art_url ? (
              <CardMedia
                component="img"
                image={release.cover_art_url}
                alt={`${release.artist} - ${release.title}`}
                sx={{ aspectRatio: "1 / 1", objectFit: "cover" }}
              />
            ) : (
              <Box
                sx={{
                  aspectRatio: "1 / 1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: "action.hover",
                  color: "action.disabled",
                }}
              >
                <AlbumIcon sx={{ fontSize: 32 }} />
              </Box>
            )}
            <Box sx={{ p: 1 }}>
              <Typography variant="body2" fontWeight={600} noWrap title={release.title}>
                {release.title}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap title={release.artist}>
                {release.artist}
              </Typography>
            </Box>
          </Card>
        ))}
      </Box>
    </Box>
  );
}
