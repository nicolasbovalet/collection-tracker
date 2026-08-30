import { useCallback, useState } from "react";
import Box from "@mui/material/Box";
import Snackbar from "@mui/material/Snackbar";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";

import AddToCollectionDialog from "./components/AddToCollectionDialog";
import CollectionTab from "./components/CollectionTab";
import SearchBar from "./components/SearchBar";
import SearchResultsList from "./components/SearchResultsList";
import WishlistTab from "./components/WishlistTab";
import { addToCollection } from "./api/releases";
import { parseArtistTitle } from "./utils/discogsFormat";

export default function App() {
  const [tab, setTab] = useState("collection");
  const [searchResults, setSearchResults] = useState([]);
  const [wishlistedMessage, setWishlistedMessage] = useState("");
  const [addToCollectionTarget, setAddToCollectionTarget] = useState(null);
  const [collectionRefreshKey, setCollectionRefreshKey] = useState(0);

  const handleResults = useCallback((results) => setSearchResults(results), []);
  const handleWishlisted = useCallback(
    () => setWishlistedMessage("Added to wishlist"),
    []
  );
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
      ...dialogPayload,
    });
    setAddToCollectionTarget(null);
    setCollectionRefreshKey((key) => key + 1);
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ p: 2 }}>
        Collection Tracker
      </Typography>
      <Box sx={{ px: 2 }}>
        <SearchBar onResults={handleResults} />
        {searchResults.length > 0 && (
          <SearchResultsList
            results={searchResults}
            onAddToCollection={handleAddToCollection}
            onWishlisted={handleWishlisted}
          />
        )}
      </Box>
      <Tabs value={tab} onChange={(_, value) => setTab(value)}>
        <Tab label="Collection" value="collection" />
        <Tab label="Wishlist" value="wishlist" />
        <Tab label="Import" value="import" />
      </Tabs>
      <Box sx={{ p: 2 }}>
        {tab === "collection" && <CollectionTab refreshKey={collectionRefreshKey} />}
        {tab === "wishlist" && <WishlistTab />}
        {tab === "import" && <Typography>Import view coming soon.</Typography>}
      </Box>
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
      />
    </Box>
  );
}
