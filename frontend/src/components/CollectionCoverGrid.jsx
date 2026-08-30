import AlbumIcon from "@mui/icons-material/Album";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardMedia from "@mui/material/CardMedia";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";

export default function CollectionCoverGrid({ releases }) {
  if (releases.length === 0) {
    return (
      <Paper
        variant="outlined"
        sx={{
          borderRadius: 2,
          py: 6,
          textAlign: "center",
          color: "text.secondary",
        }}
      >
        <Typography variant="body2">No releases match the current filters.</Typography>
      </Paper>
    );
  }

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
        gap: 2,
      }}
    >
      {releases.map((release) => (
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
                borderBottom: 1,
                borderColor: "divider",
              }}
            >
              <AlbumIcon sx={{ fontSize: 48 }} />
            </Box>
          )}
          <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
            <Typography
              variant="body2"
              fontWeight={600}
              noWrap
              title={release.artist}
            >
              {release.artist}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              noWrap
              title={release.title}
            >
              {release.title}
            </Typography>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}
