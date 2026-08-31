import { useCallback, useState } from "react";
import Box from "@mui/material/Box";
import Snackbar from "@mui/material/Snackbar";
import Typography from "@mui/material/Typography";

import AddToCollectionDialog from "../components/AddToCollectionDialog";
import SearchBar from "../components/SearchBar";
import SearchResultsList from "../components/SearchResultsList";
import { addToCollection } from "../api/releases";
import { parseArtistTitle } from "../utils/discogsFormat";

export default function SearchPage() {
  const [searchResults, setSearchResults] = useState([]);
  const [wishlistedMessage, setWishlistedMessage] = useState("");
  const [addToCollectionTarget, setAddToCollectionTarget] = useState(null);

  const handleResults = useCallback((results) => setSearchResults(results), []);
  const handleWishlisted = useCallback(() => setWishlistedMessage("Added to wishlist"), []);
  const handleAddToCollection = useCallback((result) => {
    setAddToCollectionTarget(result);
  }, []);

  const handleDialogSubmit = async (dialogPayload) => {
    const { artist, title } = parseArtistTitle(addToCollectionTarget.title);
    await addToCollection({
      discogs_release_id: addToCollectionTarget.id,
      artist,
      title,
      format: (addToCollectionTarget.format || []).join(", "),
      released_year: addToCollectionTarget.year || null,
      cover_art_url:
        addToCollectionTarget.cover_image || addToCollectionTarget.thumb || "",
      country: addToCollectionTarget.country || "",
      genre: (addToCollectionTarget.genre || []).join(", "),
      ...dialogPayload,
    });
    setAddToCollectionTarget(null);
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
        Search
      </Typography>
      <SearchBar onResults={handleResults} />
      {searchResults.length > 0 ? (
        <SearchResultsList
          results={searchResults}
          onAddToCollection={handleAddToCollection}
          onWishlisted={handleWishlisted}
        />
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Search Discogs to add releases to your wishlist or collection.
        </Typography>
      )}
      <AddToCollectionDialog
        open={Boolean(addToCollectionTarget)}
        onClose={() => setAddToCollectionTarget(null)}
        onSubmit={handleDialogSubmit}
      />
      <Snackbar
        open={Boolean(wishlistedMessage)}
        autoHideDuration={3000}
        onClose={() => setWishlistedMessage("")}
        message={wishlistedMessage}
        ContentProps={{
          sx: (theme) => ({
            bgcolor: "background.paper",
            color: "text.primary",
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 2,
            boxShadow: theme.shadows[6],
          }),
        }}
      />
    </Box>
  );
}
