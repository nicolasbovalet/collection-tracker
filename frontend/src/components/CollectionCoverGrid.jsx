import AlbumIcon from "@mui/icons-material/Album";
import MusicNoteIcon from "@mui/icons-material/MusicNote";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardMedia from "@mui/material/CardMedia";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

export default function CollectionCoverGrid({ sections }) {
  const totalCount = sections.reduce((sum, section) => sum + section.items.length, 0);

  if (totalCount === 0) {
    return (
      <Paper variant="outlined" sx={{ borderRadius: 2, py: 6, textAlign: "center", color: "text.secondary" }}>
        <Typography variant="body2">No releases match the current filters.</Typography>
      </Paper>
    );
  }

  return (
    <>
      {sections.map((section, sectionIndex) => (
        <Box key={`section-${sectionIndex}`} sx={{ mb: 3 }}>
          {section.label && (
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 700,
                mb: 1.5,
                pb: 0.5,
                borderBottom: 1,
                borderColor: "divider",
              }}
            >
              {section.label}
            </Typography>
          )}
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 2 }}>
            {section.items.map((release) => (
              <Card key={release.id} variant="outlined" sx={{ borderRadius: 2 }}>
                {release.cover_art_url ? (
                  <CardMedia component="img" image={release.cover_art_url} alt={`${release.artist} - ${release.title}`} sx={{ aspectRatio: "1 / 1", objectFit: "cover" }} />
                ) : (
                  <Box sx={{ aspectRatio: "1 / 1", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "action.hover", color: "action.disabled", borderBottom: 1, borderColor: "divider" }}>
                    <AlbumIcon sx={{ fontSize: 48 }} />
                  </Box>
                )}
                <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                  <Typography variant="body2" fontWeight={600} noWrap title={release.title}>
                    {release.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" noWrap title={release.artist}>
                    {release.artist}
                  </Typography>
                  {release.country && (
                    <Typography variant="caption" color="text.secondary" noWrap title={release.country} sx={{ display: "block" }}>
                      {release.country}
                    </Typography>
                  )}
                  {release.format && (
                    <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.5 }}>
                      <MusicNoteIcon sx={{ fontSize: 16, color: "text.secondary", flexShrink: 0 }} />
                      <Box sx={{ minWidth: 0, overflow: "hidden" }}>
                        <Typography variant="caption" color="text.secondary" noWrap title={release.format} sx={{ display: "block" }}>
                          {release.format}
                        </Typography>
                      </Box>
                    </Stack>
                  )}
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>
      ))}
    </>
  );
}
