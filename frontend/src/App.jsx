import { useCallback, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import CssBaseline from "@mui/material/CssBaseline";
import Snackbar from "@mui/material/Snackbar";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import ThemeProvider from "@mui/material/styles/ThemeProvider";
import useMediaQuery from "@mui/material/useMediaQuery";

import AddToCollectionDialog from "./components/AddToCollectionDialog";
import CollectionTab from "./components/CollectionTab";
import CsvImportPanel from "./components/CsvImportPanel";
import SearchBar from "./components/SearchBar";
import SearchResultsList from "./components/SearchResultsList";
import WishlistTab from "./components/WishlistTab";
import { addToCollection } from "./api/releases";
import { parseArtistTitle } from "./utils/discogsFormat";
import { createAppTheme } from "./theme";

export default function App() {
  // Dark is the default look; only fall back to the light palette when the
  // OS explicitly prefers light. Dark preference, no preference, or an
  // unsupported media query all resolve to dark.
  const prefersLight = useMediaQuery("(prefers-color-scheme: light)");
  const theme = useMemo(
    () => createAppTheme(prefersLight ? "light" : "dark"),
    [prefersLight]
  );

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
      country: addToCollectionTarget.country || "",
      ...dialogPayload,
    });
    setAddToCollectionTarget(null);
    setCollectionRefreshKey((key) => key + 1);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ bgcolor: "background.default", minHeight: "100vh" }}>
        <Typography variant="h5" sx={{ p: 2, fontWeight: 700 }}>
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
        <Tabs
          value={tab}
          onChange={(_, value) => setTab(value)}
          textColor="primary"
          indicatorColor="primary"
          sx={{
            px: 2,
            borderBottom: 1,
            borderColor: "divider",
            "& .MuiTab-root": {
              textTransform: "none",
              fontWeight: 500,
              minWidth: 100,
            },
            "& .Mui-selected": {
              fontWeight: 600,
            },
          }}
        >
          <Tab label="Collection" value="collection" />
          <Tab label="Wishlist" value="wishlist" />
          <Tab label="Import" value="import" />
        </Tabs>
        <Box sx={{ p: 2 }}>
          {tab === "collection" && <CollectionTab refreshKey={collectionRefreshKey} />}
          {tab === "wishlist" && <WishlistTab />}
          {tab === "import" && <CsvImportPanel />}
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
    </ThemeProvider>
  );
}
