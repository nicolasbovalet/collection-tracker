import List from "@mui/material/List";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";

import SearchResultItem from "./SearchResultItem";

export default function SearchResultsList({ results, onAddToCollection, onWishlisted }) {
  return (
    <Paper
      variant="outlined"
      sx={{ mt: 2, mb: 3, borderRadius: 2, overflow: "hidden" }}
    >
      <Typography
        variant="overline"
        color="text.secondary"
        sx={{ display: "block", px: 2, pt: 1.5, pb: 1, letterSpacing: 0.5 }}
      >
        {results.length} result{results.length === 1 ? "" : "s"}
      </Typography>
      <List disablePadding>
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
