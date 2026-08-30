import Box from "@mui/material/Box";
import List from "@mui/material/List";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";

import SearchResultItem from "./SearchResultItem";

export default function SearchResultsList({ results, onAddToCollection, onWishlisted }) {
  return (
    <Paper
      variant="outlined"
      sx={{ mt: 2, mb: 3, borderRadius: 2, overflow: "hidden" }}
    >
      <Box
        sx={(theme) => ({
          px: 2,
          py: 1.25,
          bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.08 : 0.05),
          borderBottom: `1px solid ${theme.palette.divider}`,
        })}
      >
        <Typography
          variant="overline"
          color="text.secondary"
          sx={{ letterSpacing: 0.5 }}
        >
          {results.length} result{results.length === 1 ? "" : "s"}
        </Typography>
      </Box>
      <List disablePadding sx={{ maxHeight: 480, overflowY: "auto" }}>
        {results.map((result) => (
          <SearchResultItem
            key={result.id}
            result={result}
            onAddToCollection={onAddToCollection}
            onWishlisted={onWishlisted}
          />
        ))}
      </List>
    </Paper>
  );
}
